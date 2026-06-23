import { toast } from "sonner";
import { temDicaPendente, dispensarDica } from "@/hooks/useDicaPrimeiraVez";

// Pede permissão de notificação em contexto (após ação relevante do usuário).
// Mostra toast com motivo visível; nunca dispara durante o onboarding.
// Só exibe uma vez — rastreado na chave "notificacao_pedida" de namzu_dicas.
export function pedirPermissaoNotificacao(motivo: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;
  if (!temDicaPendente("notificacao_pedida")) return;

  dispensarDica("notificacao_pedida");

  toast.info(motivo, {
    duration: 10000,
    action: {
      label: "Ativar",
      onClick: () => Notification.requestPermission(),
    },
  });
}
