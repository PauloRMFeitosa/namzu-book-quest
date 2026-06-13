import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ensureContainerLeitura } from "@/hooks/leituras/useContainerLeitura";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
const draftKey = (id: string) => `draft-insight-${id}`;

interface Props {
  livro: LivroDetalhe;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubeId?: string | null;
  clubeNome?: string | null;
}

export const InsightDialog = ({ livro, open, onOpenChange, clubeId, clubeNome }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [aprendi, setAprendi] = useState("");
  const [porque, setPorque] = useState("");
  const [publicarNoClube, setPublicarNoClube] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPublicarNoClube(false);
    const raw = localStorage.getItem(draftKey(livro.id));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.aprendi !== undefined) setAprendi(d.aprendi);
      if (d.porque !== undefined) setPorque(d.porque);
    } catch {}
  }, [open, livro.id]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(livro.id), JSON.stringify({ aprendi, porque }));
  }, [open, livro.id, aprendi, porque]);

  const salvar = async () => {
    if (!aprendi.trim()) return toast.error("Descreva o aprendizado");
    setLoading(true);
    try {
      const containerId = await ensureContainerLeitura(livro, user!.id);
      const { error } = await supabase.from("leitura_conteudo").insert({
        leitura_id: containerId,
        resumo: aprendi.trim(),
        conceito_principal: porque.trim() || null,
      });
      if (error) throw error;

      if (publicarNoClube && clubeId && user) {
        const titulo = livro.obras?.titulo_original ?? "livro";
        const conteudo = `💡 *Insight sobre "${titulo}"*\n\n${aprendi.trim()}`;
        const { error: postErr } = await supabase.from("clube_posts").insert({ clube_id: clubeId, user_id: user.id, conteudo, obra_id: livro.obra_id ?? null });
        if (postErr) throw postErr;
        qc.invalidateQueries({ queryKey: ["clube-feed", clubeId], refetchType: "all" });
      }

      toast.success("Insight registrado!");
      localStorage.removeItem(draftKey(livro.id));
      setAprendi(""); setPorque("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo insight</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">O que aprendi *</label>
            <VoiceTextarea value={aprendi} onValueChange={setAprendi} rows={3} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Por que foi importante</label>
            <VoiceTextarea value={porque} onValueChange={setPorque} rows={2} className="mt-1" />
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
