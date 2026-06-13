import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

interface Props {
  livro: LivroDetalhe;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubeId?: string | null;
  clubeNome?: string | null;
}

// ─── Star rating ───────────────────────────────────────────────────────────────
// 5 estrelas, valor 1–5, null = sem avaliação.
// Clicar na estrela já selecionada limpa a avaliação.
function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const active = hovered ?? value ?? 0;

  return (
    <div
      className="flex gap-1"
      onMouseLeave={() => setHovered(null)}
      aria-label="Avaliação em estrelas"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          className="p-0.5 rounded transition-transform hover:scale-110 focus-visible:outline-none"
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className="w-7 h-7 transition-colors"
            style={{
              fill: star <= active ? "hsl(var(--primary))" : "transparent",
              color: star <= active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          />
        </button>
      ))}
      {value !== null && (
        <span className="ml-2 self-center text-sm text-muted-foreground">
          {value}/5
        </span>
      )}
    </div>
  );
}

// ─── Dialog ────────────────────────────────────────────────────────────────────

/**
 * Resenha standalone — grava em leitura_pos.resenha (opinião + pontos) e
 * salva a avaliação (estrelas) em usuario_livros.nota.
 */
export const ResenhaDialog = ({ livro, open, onOpenChange, clubeId, clubeNome }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [opiniao, setOpiniao] = useState("");
  const [positivos, setPositivos] = useState("");
  const [negativos, setNegativos] = useState("");
  // Avaliação em estrelas (1–5), inicializada a partir de usuario_livros.nota
  const [avaliacao, setAvaliacao] = useState<number | null>(null);
  const [publicarNoClube, setPublicarNoClube] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPublicarNoClube(false);
    // Pré-preenche com nota existente (usuario_livros.nota, escala 1–5)
    setAvaliacao(livro.nota != null ? Math.round(livro.nota) : null);

    if (livro.leitura_pos?.resenha) {
      // Limpa o trecho de nota legado que ficava concatenado no texto
      const resenha = livro.leitura_pos.resenha
        .replace(/\n*\*\*Nota:\*\*\s*\S+\/10/g, "")
        .trim();
      setOpiniao(resenha);
    } else {
      setOpiniao("");
    }
    setPositivos("");
    setNegativos("");
  }, [open, livro.leitura_pos, livro.nota]);

  const salvar = async () => {
    if (!opiniao.trim()) return toast.error("Escreva sua opinião");
    setLoading(true);
    try {
      // 1. Garante sessão pos_leitura
      let leituraId = livro.pos_leitura?.id;
      if (!leituraId) {
        leituraId = await iniciarLeitura({
          usuario_leitura_id: livro.id,
          tipo: "pos_leitura",
          user_id: user!.id,
        });
      }

      // 2. Monta texto da resenha (sem nota — agora em campo separado)
      const partes = [opiniao.trim()];
      if (positivos.trim()) partes.push(`**Pontos positivos:** ${positivos.trim()}`);
      if (negativos.trim()) partes.push(`**Pontos negativos:** ${negativos.trim()}`);
      const resenha = partes.join("\n\n");

      // 3. Salva resenha em leitura_pos
      const payload = { leitura_id: leituraId, resenha };
      const { error: errResenha } = livro.leitura_pos
        ? await supabase.from("leitura_pos").update(payload).eq("leitura_id", leituraId)
        : await supabase.from("leitura_pos").insert(payload);
      if (errResenha) throw errResenha;

      // 4. Salva avaliação em usuario_livros.nota (separado da resenha)
      const { error: errNota } = await supabase
        .from("usuario_livros")
        .update({ nota: avaliacao })
        .eq("id", livro.usuario_livro_id);
      if (errNota) throw errNota;

      if (publicarNoClube && clubeId && user) {
        const titulo = livro.obras?.titulo_original ?? "livro";
        const conteudo = `📖 *Resenha de "${titulo}"*\n\n${opiniao.trim()}`;
        const { error: postErr } = await supabase.from("clube_posts").insert({ clube_id: clubeId, user_id: user.id, conteudo, obra_id: livro.obra_id ?? null });
        if (postErr) throw postErr;
        qc.invalidateQueries({ queryKey: ["clube-feed", clubeId], refetchType: "all" });
      }

      toast.success(livro.leitura_pos ? "Resenha atualizada!" : "Resenha salva!");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", livro.id] });
      // Invalida lista de livros para refletir nova nota nas estrelas
      qc.invalidateQueries({ queryKey: ["usuario-livros"] });
      qc.invalidateQueries({ queryKey: ["livros"] });
      invalidateLeituras(qc);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const jaTemResenha = !!livro.leitura_pos?.resenha;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{jaTemResenha ? "Editar resenha" : "Nova resenha"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Avaliação por estrelas */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Avaliação
              {avaliacao === null && (
                <span className="ml-1 text-muted-foreground/60">(opcional)</span>
              )}
            </label>
            <StarRating value={avaliacao} onChange={setAvaliacao} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Opinião *</label>
            <VoiceTextarea
              value={opiniao}
              onValueChange={setOpiniao}
              rows={4}
              placeholder="O que você achou do livro?"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pontos positivos</label>
            <VoiceTextarea
              value={positivos}
              onValueChange={setPositivos}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pontos negativos</label>
            <VoiceTextarea
              value={negativos}
              onValueChange={setNegativos}
              rows={2}
              className="mt-1"
            />
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
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">
            {loading ? "Salvando..." : jaTemResenha ? "Atualizar" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
