import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Wand2 } from "lucide-react";
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
}

export const RegistrarLeituraDialog = ({ usuarioLivroId, totalPaginas, disabled }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [resumo, setResumo] = useState("");
  const [conceito, setConceito] = useState("");
  const [paginasLidas, setPaginasLidas] = useState("");
  const [percentual, setPercentual] = useState("");
  const [citacoes, setCitacoes] = useState<Citacao[]>([]);
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [links, setLinks] = useState<Link[]>([]);

  const reset = () => {
    setResumo(""); setConceito(""); setPaginasLidas(""); setPercentual("");
    setCitacoes([]); setAplicacoes([]); setTags([]); setLinks([]);
  };

  const salvar = async () => {
    if (!resumo.trim() && !conceito.trim() && !paginasLidas) {
      return toast.error("Informe pelo menos resumo, conceito ou páginas lidas");
    }
    setLoading(true);
    try {
      const { data: leitura, error } = await supabase
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
      const lid = leitura.id;

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

      toast.success("Leitura registrada!");
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
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Resumo</label>
            <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} className="rounded-xl mt-1" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Conceito principal</label>
            <Input value={conceito} onChange={(e) => setConceito(e.target.value)} className="h-11 rounded-xl mt-1" />
          </div>

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

          {/* Citações */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Citações</label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCitacoes([...citacoes, { texto: "", pagina: "" }])}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
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
          </div>

          {/* Aplicações */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Aplicações</label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAplicacoes([...aplicacoes, { descricao: "", plano_acao: null }])}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
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
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="mt-2"><TagsInput tags={tags} onChange={setTags} /></div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Links</label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setLinks([...links, { tipo: "url", url: "", descricao: "" }])}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
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
          </div>

          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl bg-primary hover:bg-primary-hover sticky bottom-0">
            {loading ? "Salvando..." : "Salvar leitura"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
