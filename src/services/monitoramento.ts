import { supabase } from "@/integrations/supabase/client";
import {
  ambienteDoApp,
  assinaturaDoErro,
  criarLimitador,
  descreverErro,
  ehRuido,
  limparRota,
  type OrigemDoErro,
} from "@/lib/monitoramento";

// Monitoramento de erros em produção (Fase 0). Os erros vão para a tabela
// `erros_app`, lida só por admins em Admin > Erros do app. As regras estão em
// docs/monitoramento.md.

const podeEnviar = criarLimitador();

/**
 * Registra um erro do app. Nunca lança e não devolve nada: monitorar não pode
 * atrapalhar quem está usando. Sem sessão, não grava. Em desenvolvimento só
 * escreve no console.
 */
export function registrarErro(origem: OrigemDoErro, valor: unknown, pilhaExtra?: string | null): void {
  try {
    const erro = descreverErro(valor);
    if (ehRuido(erro)) return;
    const assinatura = assinaturaDoErro(origem, erro.mensagem);
    if (!podeEnviar(assinatura)) return;
    if (!import.meta.env.PROD) {
      console.info("[monitoramento]", origem, erro.mensagem);
      return;
    }
    const pilha = [erro.pilha, pilhaExtra].filter(Boolean).join("\n").slice(0, 4000) || null;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        // Cast temporário: sai quando os tipos forem regenerados após a migração.
        await (supabase as any).from("erros_app").insert({
          origem,
          assinatura,
          mensagem: erro.mensagem,
          pilha,
          rota: limparRota(window.location.pathname),
          versao: __VERSAO_APP__,
          ambiente: ambienteDoApp(window.location.hostname),
          navegador: navigator.userAgent.slice(0, 300),
        });
      } catch {
        // silencioso de propósito
      }
    })();
  } catch {
    // silencioso de propósito
  }
}

let iniciado = false;

/** Passa a ouvir erros não tratados e promessas rejeitadas. Chamar uma vez, ao abrir o app. */
export function iniciarMonitoramento(): void {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  window.addEventListener("error", (evento) => registrarErro("erro", evento.error ?? evento.message));
  window.addEventListener("unhandledrejection", (evento) => registrarErro("promessa", evento.reason));
}
