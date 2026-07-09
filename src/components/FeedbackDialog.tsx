import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Flag, Bug, Lightbulb } from "lucide-react";

const DRAFT_KEY = "draft-feedback-geral";

type TipoFeedback = "denuncia" | "erro" | "sugestao";

const TIPOS: { value: TipoFeedback; label: string; icon: React.ElementType }[] = [
  { value: "denuncia", label: "Denúncia", icon: Flag },
  { value: "erro", label: "Erro", icon: Bug },
  { value: "sugestao", label: "Sugestão", icon: Lightbulb },
];

const PLACEHOLDERS: Record<TipoFeedback, string> = {
  denuncia:
    "Descreva o conteúdo inadequado e onde ele está. Se for violação de direitos autorais, informe a obra e, se possível, comprove a titularidade.",
  erro: "Descreva o erro: o que você estava fazendo, o que aconteceu e o que esperava que acontecesse.",
  sugestao: "Descreva sua sugestão de melhoria ou nova funcionalidade.",
};

const MENSAGENS_SUCESSO: Record<TipoFeedback, string> = {
  denuncia: "Denúncia registrada. Nossa equipe irá analisar.",
  erro: "Erro comunicado. Obrigado por nos avisar!",
  sugestao: "Sugestão enviada. Obrigado por contribuir!",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

// Canal geral de feedback acessível pelo cabeçalho: denúncias, erros e sugestões
// são gravados em denuncias_conteudo e revisados pelo admin na aba Denúncias e Sugestões.
export const FeedbackDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const [tipo, setTipo] = useState<TipoFeedback>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.tipo !== undefined) setTipo(d.tipo);
      if (d.mensagem !== undefined) setMensagem(d.mensagem);
    } catch {}
  }, [open]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ tipo, mensagem }));
  }, [open, tipo, mensagem]);

  const enviar = async () => {
    if (!mensagem.trim()) return toast.error("Descreva sua mensagem antes de enviar");
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("denuncias_conteudo").insert({
        denunciante_id: user.id,
        denunciado_user_id: null,
        tipo_conteudo: tipo,
        conteudo_id: null,
        contexto_url: location.pathname,
        motivo: mensagem.trim(),
      });
      if (error) throw error;
      toast.success(MENSAGENS_SUCESSO[tipo]);
      localStorage.removeItem(DRAFT_KEY);
      setMensagem("");
      setTipo("sugestao");
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
          <DialogTitle>Fale com a gente</DialogTitle>
          <DialogDescription>
            Denuncie um conteúdo inadequado, comunique um erro do app ou envie uma sugestão de melhoria. Nossa equipe irá analisar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Tipo *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TIPOS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTipo(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                    tipo === value
                      ? "border-primary bg-secondary text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mensagem *</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder={PLACEHOLDERS[tipo]}
              className="rounded-xl mt-1"
            />
          </div>
          <Button onClick={enviar} disabled={loading} className="h-11 rounded-2xl">
            {loading ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
