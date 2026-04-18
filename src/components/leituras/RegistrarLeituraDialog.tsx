import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Wand2, BookOpen, Quote, Target, Tag, Link2, BarChart3 } from "lucide-react";
import { TagsInput } from "./TagsInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Citacao = { texto: string; pagina: string };
type Aplicacao = { descricao: string; plano_acao: any };
type Link = { tipo: string; url: string; descricao: string };

const gerarPlanoAcao = (descricao: string) => ({
  passos: descricao
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((texto, i) => ({ ordem: i + 1, texto, feito: false })),
  prazo: null,
  criado_em: new Date().toISOString(),
});

interface Props {
  usuarioLivroId: string;
  totalPaginas: number | null;
  disabled?: boolean;
  /** Quando passado, abre em modo edição com os valores iniciais */
  leitura?: import("@/hooks/leituras/useLivroDetalhe").LeituraFull | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  /** Esconde o trigger padrão (usado em modo edição controlado externamente) */
  hideTrigger?: boolean;
}

export const RegistrarLeituraDialog = ({
  usuarioLivroId,
  totalPaginas,
  disabled,
  leitura,
  open: openProp,
  onOpenChange,
  hideTrigger,
}: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
  const [loading, setLoading] = useState(false);
  const isEdit = !!leitura;

  const c0 = leitura?.leitura_conteudo?.[0];
  const [resumo, setResumo] = useState(c0?.resumo ?? "");
  const [conceito, setConceito] = useState(c0?.conceito_principal ?? "");
  const [paginasLidas, setPaginasLidas] = useState(leitura?.paginas_lidas?.toString() ?? "");
  const [percentual, setPercentual] = useState(leitura?.percentual_lido?.toString() ?? "");
  const [citacoes, setCitacoes] = useState<Citacao[]>(
    leitura?.leitura_citacoes?.map((q) => ({ texto: q.texto, pagina: q.pagina?.toString() ?? "" })) ?? []
  );
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>(
    leitura?.leitura_aplicacoes?.map((a) => ({ descricao: a.descricao, plano_acao: a.plano_acao })) ?? []
  );
  const [tags, setTags] = useState<string[]>(
    leitura?.leitura_tags?.map((t) => t.tags?.nome).filter(Boolean) as string[] ?? []
  );
  const [links, setLinks] = useState<Link[]>(
    leitura?.leitura_links?.map((l) => ({ tipo: l.tipo ?? "url", url: l.url, descricao: l.descricao ?? "" })) ?? []
  );

  const reset = () => {
    if (isEdit) return;
    setResumo(""); setConceito(""); setPaginasLidas(""); setPercentual("");
    setCitacoes([]); setAplicacoes([]); setTags([]); setLinks([]);
  };

  const salvar = async () => {
    const temConteudo = resumo.trim() || conceito.trim();
    const temProgresso = paginasLidas || percentual;
    const temCitacoes = citacoes.some((c) => c.texto.trim());
    const temAplicacoes = aplicacoes.some((a) => a.descricao.trim());
    const temTags = tags.length > 0;
    const temLinks = links.some((l) => l.url.trim());

    if (!temConteudo && !temProgresso && !temCitacoes && !temAplicacoes && !temTags && !temLinks) {
      return toast.error("Preencha pelo menos uma seção da leitura");
    }
    setLoading(true);
    try {
      let lid: string;
      if (isEdit) {
        lid = leitura!.id;
        const { error } = await supabase
          .from("leituras")
          .update({
            paginas_lidas: paginasLidas ? Number(paginasLidas) : null,
            percentual_lido: percentual ? Number(percentual) : null,
          })
          .eq("id", lid);
        if (error) throw error;
        // Apaga filhos para reinserir
        await Promise.all([
          supabase.from("leitura_conteudo").delete().eq("leitura_id", lid),
          supabase.from("leitura_citacoes").delete().eq("leitura_id", lid),
          supabase.from("leitura_aplicacoes").delete().eq("leitura_id", lid),
          supabase.from("leitura_links").delete().eq("leitura_id", lid),
          supabase.from("leitura_tags").delete().eq("leitura_id", lid),
        ]);
      } else {
        const { data: novaLeitura, error } = await supabase
          .from("leituras")
          .insert({
            user_id: user!.id,
            usuario_livro_id: usuarioLivroId,
            tipo: "leitura",
            paginas_lidas: paginasLidas ? Number(paginasLidas) : null,
            percentual_lido: percentual ? Number(percentual) : null,
          })
          .select("id")
          .single();
        if (error) throw error;
        lid = novaLeitura.id;
      }

      if (resumo.trim() || conceito.trim()) {
        await supabase.from("leitura_conteudo").insert({
          leitura_id: lid,
          resumo: resumo.trim() || null,
          conceito_principal: conceito.trim() || null,
        });
      }

      if (citacoes.length) {
        await supabase.from("leitura_citacoes").insert(
          citacoes.filter((c) => c.texto.trim()).map((c) => ({
            leitura_id: lid,
            texto: c.texto.trim(),
            pagina: c.pagina ? Number(c.pagina) : null,
          }))
        );
      }

      if (aplicacoes.length) {
        await supabase.from("leitura_aplicacoes").insert(
          aplicacoes.filter((a) => a.descricao.trim()).map((a) => ({
            leitura_id: lid,
            descricao: a.descricao.trim(),
            plano_acao: a.plano_acao,
          }))
        );
      }

      if (links.length) {
        await supabase.from("leitura_links").insert(
          links.filter((l) => l.url.trim()).map((l) => ({
            leitura_id: lid,
            tipo: l.tipo || null,
            url: l.url.trim(),
            descricao: l.descricao.trim() || null,
          }))
        );
      }

      if (tags.length) {
        const tagIds: string[] = [];
        for (const nome of tags) {
          const { data: existing } = await supabase
            .from("tags")
            .select("id")
            .ilike("nome", nome)
            .maybeSingle();
          if (existing) {
            tagIds.push(existing.id);
          } else {
            const { data: nova, error: te } = await supabase
              .from("tags")
              .insert({ nome })
              .select("id")
              .single();
            if (te) throw te;
            tagIds.push(nova.id);
          }
        }
        if (tagIds.length) {
          await supabase.from("leitura_tags").insert(
            tagIds.map((tag_id) => ({ leitura_id: lid, tag_id }))
          );
        }
      }

      toast.success(isEdit ? "Leitura atualizada!" : "Leitura registrada!");
      reset();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLivroId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="h-11 rounded-2xl bg-primary hover:bg-primary-hover">
          <Plus className="w-4 h-4" /> Registrar leitura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova leitura</DialogTitle>
          <p className="text-xs text-muted-foreground">Preencha apenas as seções que desejar registrar nesta sessão.</p>
        </DialogHeader>

        <Tabs defaultValue="conteudo" className="flex flex-col gap-4">
          <TabsList className="grid grid-cols-6 h-auto">
            <TabsTrigger value="conteudo" className="flex-col gap-0.5 py-2 text-[10px]"><BookOpen className="w-4 h-4" />Conteúdo</TabsTrigger>
            <TabsTrigger value="progresso" className="flex-col gap-0.5 py-2 text-[10px]"><BarChart3 className="w-4 h-4" />Progresso</TabsTrigger>
            <TabsTrigger value="citacoes" className="flex-col gap-0.5 py-2 text-[10px]"><Quote className="w-4 h-4" />Citações</TabsTrigger>
            <TabsTrigger value="aplicacoes" className="flex-col gap-0.5 py-2 text-[10px]"><Target className="w-4 h-4" />Aplicar</TabsTrigger>
            <TabsTrigger value="tags" className="flex-col gap-0.5 py-2 text-[10px]"><Tag className="w-4 h-4" />Tags</TabsTrigger>
            <TabsTrigger value="links" className="flex-col gap-0.5 py-2 text-[10px]"><Link2 className="w-4 h-4" />Links</TabsTrigger>
          </TabsList>

          <TabsContent value="conteudo" className="flex flex-col gap-3 mt-0">
            <p className="text-xs text-muted-foreground">Salvo em <code>leitura_conteudo</code></p>
            <div>
              <label className="text-xs text-muted-foreground">Resumo</label>
              <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={4} className="rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Conceito principal</label>
              <Input value={conceito} onChange={(e) => setConceito(e.target.value)} className="h-11 rounded-xl mt-1" />
            </div>
          </TabsContent>

          <TabsContent value="progresso" className="flex flex-col gap-3 mt-0">
            <p className="text-xs text-muted-foreground">Salvo em <code>leituras</code></p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Páginas lidas</label>
                <Input type="number" min={0} max={totalPaginas ?? undefined} value={paginasLidas} onChange={(e) => setPaginasLidas(e.target.value)} className="h-11 rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ou %</label>
                <Input type="number" min={0} max={100} value={percentual} onChange={(e) => setPercentual(e.target.value)} className="h-11 rounded-xl mt-1" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="citacoes" className="flex flex-col gap-2 mt-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Salvo em <code>leitura_citacoes</code></p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCitacoes([...citacoes, { texto: "", pagina: "" }])}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {citacoes.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma citação adicionada.</p>}
            {citacoes.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Textarea value={c.texto} onChange={(e) => {
                  const n = [...citacoes]; n[i].texto = e.target.value; setCitacoes(n);
                }} rows={2} placeholder="Trecho" className="rounded-xl flex-1" />
                <div className="flex flex-col gap-1 w-20">
                  <Input type="number" placeholder="pg" value={c.pagina} onChange={(e) => {
                    const n = [...citacoes]; n[i].pagina = e.target.value; setCitacoes(n);
                  }} className="h-10 rounded-xl" />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setCitacoes(citacoes.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="aplicacoes" className="flex flex-col gap-2 mt-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Salvo em <code>leitura_aplicacoes</code></p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAplicacoes([...aplicacoes, { descricao: "", plano_acao: null }])}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {aplicacoes.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma aplicação adicionada.</p>}
            {aplicacoes.map((a, i) => (
              <div key={i} className="flex flex-col gap-1 card-soft p-2">
                <Textarea value={a.descricao} onChange={(e) => {
                  const n = [...aplicacoes]; n[i].descricao = e.target.value; setAplicacoes(n);
                }} rows={2} placeholder="Como aplicar?" className="rounded-xl" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="rounded-xl flex-1" onClick={() => {
                    const n = [...aplicacoes]; n[i].plano_acao = gerarPlanoAcao(a.descricao); setAplicacoes(n);
                    toast.success("Plano gerado");
                  }}>
                    <Wand2 className="w-3 h-3" /> Gerar plano
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAplicacoes(aplicacoes.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {a.plano_acao && (
                  <ol className="text-xs text-muted-foreground list-decimal pl-4">
                    {a.plano_acao.passos?.map((p: any) => <li key={p.ordem}>{p.texto}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tags" className="flex flex-col gap-2 mt-0">
            <p className="text-xs text-muted-foreground">Salvo em <code>leitura_tags</code> + <code>tags</code></p>
            <TagsInput tags={tags} onChange={setTags} />
          </TabsContent>

          <TabsContent value="links" className="flex flex-col gap-2 mt-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Salvo em <code>leitura_links</code></p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setLinks([...links, { tipo: "url", url: "", descricao: "" }])}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {links.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum link adicionado.</p>}
            {links.map((l, i) => (
              <div key={i} className="flex flex-col gap-1 card-soft p-2">
                <div className="flex gap-2">
                  <select value={l.tipo} onChange={(e) => {
                    const n = [...links]; n[i].tipo = e.target.value; setLinks(n);
                  }} className="h-10 rounded-xl bg-background border border-input px-2 text-sm">
                    <option value="url">URL</option>
                    <option value="video">Vídeo</option>
                    <option value="audio">Áudio</option>
                    <option value="documento">Documento</option>
                  </select>
                  <Input value={l.url} onChange={(e) => {
                    const n = [...links]; n[i].url = e.target.value; setLinks(n);
                  }} placeholder="https://" className="h-10 rounded-xl flex-1" />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <Input value={l.descricao} onChange={(e) => {
                  const n = [...links]; n[i].descricao = e.target.value; setLinks(n);
                }} placeholder="Descrição" className="h-10 rounded-xl" />
              </div>
            ))}
          </TabsContent>

          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl bg-primary hover:bg-primary-hover">
            {loading ? "Salvando..." : "Salvar leitura"}
          </Button>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
