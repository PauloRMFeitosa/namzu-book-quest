import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const draftKey = (id: string) => `draft-denuncia-${id}`;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** tipo do conteúdo denunciado: 'citacao' | 'insight' | 'resenha' | 'leitura' | 'perfil' */
  tipoConteudo: string;
  /** id do registro denunciado, quando houver (usuario_livro, citação etc.) */
  conteudoId?: string | null;
  /** dono do conteúdo denunciado */
  denunciadoUserId?: string | null;
}

// Canal oficial de notificação (notice and takedown) previsto nos Termos de Uso:
// registra a denúncia para revisão do admin na aba Denúncias.
export const ReportarConteudoDialog = ({ open, onOpenChange, tipoConteudo, conteudoId, denunciadoUserId }: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const chave = conteudoId ?? tipoConteudo;

  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(chave));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.motivo !== undefined) setMotivo(d.motivo);
    } catch {}
  }, [open, chave]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey(chave), JSON.stringify({ motivo }));
  }, [open, chave, motivo]);

  const enviar = async () => {
    if (!motivo.trim()) return toast.error("Descreva o motivo da denúncia");
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("denuncias_conteudo").insert({
        denunciante_id: user.id,
        denunciado_user_id: denunciadoUserId ?? null,
        tipo_conteudo: tipoConteudo,
        conteudo_id: conteudoId ?? null,
        contexto_url: location.pathname,
        motivo: motivo.trim(),
      });
      if (error) throw error;
      toast.success("Denúncia registrada. Nossa equipe irá analisar.");
      localStorage.removeItem(draftKey(chave));
      setMotivo("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reportar conteúdo</DialogTitle>
          <DialogDescription>
            Use este canal para notificar violação de direitos autorais (Lei 9.610/98) ou outro conteúdo inadequado. A equipe analisará e removerá o conteúdo se necessário.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Motivo *</label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="Descreva o problema. Se for violação de direitos autorais, informe a obra e, se possível, comprove a titularidade."
              className="rounded-xl mt-1"
            />
          </div>
          <Button onClick={enviar} disabled={loading} className="h-11 rounded-2xl">
            {loading ? "Enviando..." : "Enviar denúncia"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
