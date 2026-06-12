import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
import { useMinhaResenha, useUpsertResenha } from "@/hooks/leituras/useResenhas";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Award, BookMarked, Quote, Tag, Target, ExternalLink, Wand2, Trash2, Plus, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";
import { invalidateLeituras } from "@/lib/queryInvalidation";

export const PosLeituraBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const pos = livro.leitura_pos;
  const posSessao = livro.pos_leitura;
  const obraId = livro.obra_id;
  const leiturasReais = livro.leituras.filter((l) => l.tipo === "leitura");

  const resumoConcat = leiturasReais
    .map((l) => l.leitura_conteudo[0]?.resumo)
    .filter(Boolean)
    .join("\n\n");

  const todasCitacoes = leiturasReais.flatMap((l) => l.leitura_citacoes);
  const todasAplicacoes = leiturasReais.flatMap((l) => l.leitura_aplicacoes);
  const todosLinks = leiturasReais.flatMap((l) => l.leitura_links);
  const todasTags = Array.from(
    new Map(
      leiturasReais.flatMap((l) => l.leitura_tags.filter((t) => t.tags).map((t) => [t.tags!.id, t.tags!]))
    ).values()
  );

  const { data: resenhaPublicada } = useMinhaResenha(obraId);
  const upsertResenha = useUpsertResenha();

  const [resumoGeral, setResumoGeral] = useState(pos?.resumo_geral ?? resumoConcat);
  const [ideia, setIdeia] = useState(pos?.ideia_principal ?? "");
  const [resenha, setResenha] = useState(pos?.resenha ?? "");
  const [spoiler, setSpoiler] = useState<boolean>(pos?.tem_spoiler ?? false);
  const [publica, setPublica] = useState<boolean>(pos?.publica ?? false);
  const [publicarResenha, setPublicarResenha] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (pos) {
      setResumoGeral(pos.resumo_geral ?? "");
      setIdeia(pos.ideia_principal ?? "");
      setResenha(pos.resenha ?? "");
      setSpoiler(pos.tem_spoiler ?? false);
      setPublica(pos.publica ?? false);
    }
  }, [pos]);

  // Pré-marca o toggle se já existe resenha publicada
  useEffect(() => {
    if (resenhaPublicada) setPublicarResenha(true);
  }, [resenhaPublicada]);

  const excluir = async () => {
    if (!posSessao?.id) return;
    setRemoving(true);
    try {
      await supabase.from("leitura_pos").delete().eq("leitura_id", posSessao.id);
      const { error } = await supabase.from("leituras").delete().eq("id", posSessao.id);
      if (error) throw error;
      toast.success("Pós-leitura excluída");
      setConfirmDel(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRemoving(false);
    }
  };

  const salvar = async () => {
    if (livro.status !== "concluido") {
      return toast.error("Finalize a leitura antes de registrar a pós-leitura");
    }
    setLoading(true);
    try {
      let leituraId = posSessao?.id;
      if (!leituraId) {
        leituraId = await iniciarLeitura({
          usuario_leitura_id: livro.id,
          tipo: "pos_leitura",
          user_id: user!.id,
        });
      }
      const payload = {
        leitura_id: leituraId,
        resumo_geral: resumoGeral || null,
        ideia_principal: ideia || null,
        resenha: resenha || null,
        tem_spoiler: spoiler,
        publica,
      };
      let error;
      if (pos) {
        ({ error } = await supabase.from("leitura_pos").update(payload).eq("leitura_id", leituraId));
      } else {
        ({ error } = await supabase.from("leitura_pos").insert(payload));
      }
      if (error) throw error;

      // Publica no acervo de resenhas se solicitado
      if (publicarResenha && obraId && resenha.trim()) {
        await upsertResenha.mutateAsync({
          obra_id: obraId,
          leitura_id: leituraId,
          texto: resenha.trim(),
          tem_spoiler: spoiler,
          visibilidade: "publica",
        });
        toast.success("Pós-leitura salva e resenha publicada!");
      } else {
        toast.success("Pós-leitura salva!");
      }

      setAdding(false);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarPlano = async (aplicacaoId: string, descricao: string) => {
    const plano = {
      passos: descricao.split(/[.\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
        .map((texto, i) => ({ ordem: i + 1, texto, feito: false })),
      prazo: null,
      criado_em: new Date().toISOString(),
    };
    const { error } = await supabase.from("leitura_aplicacoes").update({ plano_acao: plano }).eq("id", aplicacaoId);
    if (error) return toast.error(error.message);
    toast.success("Plano gerado");
    qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
  };

  const formBlock = (
    <div className="p-3 rounded-xl bg-muted/30 flex flex-col gap-3">
      <div>
        <label className="text-xs text-muted-foreground">Resumo geral</label>
        <VoiceTextarea value={resumoGeral} onValueChange={setResumoGeral} rows={4} className="mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Ideia principal</label>
        <VoiceTextarea value={ideia} onValueChange={setIdeia} rows={2} className="mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Resenha</label>
        <VoiceTextarea value={resenha} onValueChange={setResenha} rows={4} className="mt-1" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={spoiler} onCheckedChange={(v) => setSpoiler(!!v)} /> Contém spoiler
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={publica} onCheckedChange={(v) => setPublica(!!v)} /> Tornar público
        </label>
      </div>

      {/* Toggle: publicar resenha */}
      {resenha.trim() && obraId && (
        <label className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer">
          <Checkbox
            checked={publicarResenha}
            onCheckedChange={(v) => setPublicarResenha(!!v)}
            className="mt-0.5"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5 text-primary" />
              Publicar no acervo de resenhas
            </span>
            <span className="text-xs text-muted-foreground">
              {resenhaPublicada
                ? "Você já tem uma resenha publicada para este livro. Salvar irá atualizá-la."
                : "Sua resenha ficará visível para outros leitores do Namzu."}
            </span>
          </div>
        </label>
      )}

      <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl bg-primary hover:bg-primary-hover">
        {loading ? "Salvando..." : pos ? "Salvar alterações" : "Salvar pós-leitura"}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {pos ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="pos" className="card-soft border-none px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Pós-leitura
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3 flex flex-col gap-3">
              {editing ? (
                formBlock
              ) : (
                <div className="p-3 rounded-xl bg-muted/30 flex flex-col gap-2">
                  {pos.resumo_geral && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo geral</p>
                      <p className="text-sm whitespace-pre-wrap">{pos.resumo_geral}</p>
                    </div>
                  )}
                  {pos.ideia_principal && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Ideia principal</p>
                      <p className="text-sm">{pos.ideia_principal}</p>
                    </div>
                  )}
                  {pos.resenha && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Resenha</p>
                      <p className="text-sm whitespace-pre-wrap">{pos.resenha}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={() => setEditing((v) => !v)}>
                  <Pencil className="w-3 h-3" /> {editing ? "Cancelar" : "Editar"}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setConfirmDel(true)}>
                  <Trash2 className="w-3 h-3" /> Excluir
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <div className="card-soft px-3 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Pós-leitura
            </span>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAdding((v) => !v)}>
              <Plus className="w-3 h-3" /> {adding ? "Cancelar" : "Adicionar pós-leitura"}
            </Button>
          </div>
          {adding && formBlock}
        </div>
      )}

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pós-leitura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o resumo geral, ideia principal e resenha desta leitura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir} disabled={removing} className="bg-destructive hover:bg-destructive/90">
              {removing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {todasCitacoes.length > 0 && (
        <div className="p-3 rounded-xl bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><Quote className="w-4 h-4 text-primary" /> Todas as citações</h4>
          <ul className="flex flex-col gap-2">
            {todasCitacoes.map((c) => (
              <li key={c.id} className="text-sm border-l-2 border-primary pl-2 italic">
                "{c.texto}"{c.pagina ? <span className="text-xs not-italic text-muted-foreground"> · pg {c.pagina}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {todasAplicacoes.length > 0 && (
        <div className="p-3 rounded-xl bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-primary" /> Todas as aplicações</h4>
          <ul className="flex flex-col gap-3">
            {todasAplicacoes.map((a) => (
              <li key={a.id} className="text-sm">
                <p>{a.descricao}</p>
                {a.plano_acao?.passos ? (
                  <ol className="text-xs text-muted-foreground list-decimal pl-5 mt-1">
                    {a.plano_acao.passos.map((p: any) => <li key={p.ordem}>{p.texto}</li>)}
                  </ol>
                ) : (
                  <Button size="sm" variant="outline" className="rounded-xl mt-1" onClick={() => gerarPlano(a.id, a.descricao)}>
                    <Wand2 className="w-3 h-3" /> Gerar plano
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {todasTags.length > 0 && (
        <div className="p-3 rounded-xl bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><Tag className="w-4 h-4 text-primary" /> Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {todasTags.map((t) => (
              <span key={t.id} className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">{t.nome}</span>
            ))}
          </div>
        </div>
      )}

      {todosLinks.length > 0 && (
        <div className="p-3 rounded-xl bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><ExternalLink className="w-4 h-4 text-primary" /> Links</h4>
          <ul className="flex flex-col gap-1">
            {todosLinks.map((l) => (
              <li key={l.id} className="text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="text-primary underline">{l.descricao || l.url}</a>
                {l.tipo && <span className="text-xs text-muted-foreground ml-1">({l.tipo})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
