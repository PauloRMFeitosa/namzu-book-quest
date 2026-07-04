// Serviço de analytics do funil de onboarding.
// Em produção, dispara para Google Analytics (se window.gtag estiver presente).
// Em dev, imprime no console. Pode ser trocado por Mixpanel/Amplitude sem
// alterar os call sites.

export type EventoOnboarding =
  | "onboarding_iniciado"         // T1 carregada
  | "onboarding_etapa_concluida"  // usuário avançou (props: etapa, dados)
  | "onboarding_etapa_pulada"     // usuário pulou (props: etapa)
  | "onboarding_resultado_visto"  // T5 exibida
  | "onboarding_signup_iniciado"  // T6 exibida
  | "onboarding_signup_concluido" // conta criada com sucesso
  | "onboarding_abandonado";      // saiu antes de completar

interface Props {
  etapa?: number;
  total_generos?: number;
  total_livros?: number;
  objetivo?: string;
  metodo_signup?: "email" | "google";
  [key: string]: unknown;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackOnboarding(evento: EventoOnboarding, props: Props = {}): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", evento, { event_category: "onboarding", ...props });
    }
    if (import.meta.env.DEV) {
      console.info("[analytics:onboarding]", evento, props);
    }
  } catch {
    // nunca deixar falha de analytics afetar o usuário
  }
}
