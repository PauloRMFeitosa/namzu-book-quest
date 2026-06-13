import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "@/components/leituras/TagsInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ensureContainerLeitura } from "@/hooks/leituras/useContainerLeitura";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
const draftKey = (id: string) => `draft-citacao-${id}`;

interface Props {
  livro: LivroDetalhe;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubeId?: string | null;
  clubeNome?: string | null;
}

export const CitacaoDialog = ({ livro, open, onOpenChange, clubeId, clubeNome }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState("");
  const [comentario, setComentario] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [publicarNoClube, setPublicarNoClube] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPublicarNoClube(false);
    const raw = localStorage.getItem(draftKey(livro.id));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.texto !== undefined) setTexto(d.texto);
      if (d.pagina !== undefined) setPagina(d.pagina);
      if (d.comentario !== undefined) setComentario(d.comentario);
      if (d.tags?.length) setTags(d.tags);
    } catch {}
  }, [open, livro.id]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(livro.id), JSON.stringify({ texto, pagina, comentario, tags }));
  }, [open, livro.id, texto, pagina, comentario, tags]);

  const salvar = async () => {
    if (!texto.trim()) return toast.error("Informe o texto da citação");
    setLoading(true);
    try {
      const containerId = await ensureContainerLeitura(livro, user!.id);
      const textoFinal = comentario.trim()
        ? `${texto.trim()}\n\n— ${comentario.trim()}`
        : texto.trim();
      const { error } = await supabase.from("leitura_citacoes").insert({
        leitura_id: containerId,
        texto: textoFinal,
        pagina: pagina ? Number(pagina) : null,
      });
      if (error) throw error;

      if (tags.length) {
        const tagIds: string[] = [];
        for (const nome of tags) {
          const { data: existing } = await supabase.from("tags").select("id").ilike("nome", nome).maybeSingle();
          if (existing) tagIds.push(existing.id);
          else {
            const { data: nova, error: te } = await supabase.from("tags").insert({ nome }).select("id").single();
            if (te) throw te;
            tagIds.push(nova.id);
          }
        }
        await supabase.from("leitura_tags").insert(tagIds.map((tag_id) => ({ leitura_id: containerId, tag_id })));
      }

      if (publicarNoClube && clubeId && user) {
        const titulo = livro.obras?.titulo_original ?? "livro";
        const conteudo = `💬 *Citação de "${titulo}"*\n\n"${textoFinal}"`;
        const { error: postErr } = await supabase.from("clube_posts").insert({ clube_id: clubeId, user_id: user.id, conteudo, obra_id: livro.obra_id ?? null });
        if (postErr) throw postErr;
        qc.invalidateQueries({ queryKey: ["clube-feed", clubeId], refetchType: "all" });
      }

      toast.success("Citação registrada!");
      localStorage.removeItem(draftKey(livro.id));
      setTexto(""); setPagina(""); setComentario(""); setTags([]);
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova citação</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Texto *</label>
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Página</label>
            <Input type="number" value={pagina} onChange={(e) => setPagina(e.target.value)} className="h-11 rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Comentário pessoal</label>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tags</label>
            <TagsInput tags={tags} onChange={setTags} />
          </div>
          {clubeId && clubeNome && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={publicarNoClube}
                onChange={(e) => setPublicarNoClube(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-sm text-muted-foreground leading-snug">
                Publicar no feed do clube <strong className="text-foreground">{clubeNome}</strong>
              </span>
            </label>
          )}
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
