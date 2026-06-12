import { useState } from "react";
import { Star, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  usuarioLivroId: string;
  titulo: string;
  capaUrl?: string | null;
  /** Callback chamado após salvar com sucesso */
  onSaved?: () => void;
}

const STARS = [1, 2, 3, 4, 5];

export const AvaliacaoModal = ({ open, onOpenChange, usuarioLivroId, titulo, capaUrl, onSaved }: Props) => {
  const qc = useQueryClient();
  const [nota, setNota] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (nota === 0) {
      toast.error("Selecione uma nota antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("usuario_livros")
        .update({ nota, review_texto: review.trim() || null })
        .eq("id", usuarioLivroId);
      if (error) throw error;

      // O trigger trg_usuario_livros_marcar_avaliado já atualiza o status no banco.
      qc.invalidateQueries({ queryKey: ["pendencias-avaliacao"] });
      qc.invalidateQueries({ queryKey: ["obra-avaliacoes"] });
      qc.invalidateQueries({ queryKey: ["meus-livros"] });
      qc.invalidateQueries({ queryKey: ["meu-livro-obra"] });
      qc.invalidateQueries({ queryKey: ["notificacoes-count"] });
      qc.invalidateQueries({ queryKey: ["obra-estatisticas"] });

      toast.success("Avaliação salva!");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar avaliação");
    } finally {
      setSaving(false);
    }
  };

  const active = hover || nota;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar livro</DialogTitle>
        </DialogHeader>

        {/* Capa + título */}
        <div className="flex items-center gap-3">
          {capaUrl ? (
            <img src={capaUrl} alt="" className="w-14 h-20 rounded-lg object-cover shadow-soft flex-shrink-0" />
          ) : (
            <div className="w-14 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
          )}
          <p className="font-semibold leading-tight line-clamp-3">{titulo}</p>
        </div>

        {/* Estrelas interativas */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Qual nota você dá?</p>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {STARS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNota(s)}
                onMouseEnter={() => setHover(s)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${s} estrela${s > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    s <= active ? "fill-primary text-primary" : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
          {nota > 0 && (
            <p className="text-xs text-muted-foreground">
              {["", "Não gostei", "Regular", "Bom", "Muito bom", "Excelente"][nota]}
            </p>
          )}
        </div>

        {/* Resenha opcional */}
        <Textarea
          placeholder="Escreva uma resenha (opcional)…"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={3}
          className="rounded-xl resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={saving || nota === 0}
            className="bg-primary hover:bg-primary-hover"
          >
            {saving ? "Salvando…" : "Salvar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
