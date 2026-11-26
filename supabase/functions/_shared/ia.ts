// Chamada ao modelo de IA, compartilhada por `clube-ai` e `leitura-copiloto`.
//
// Provedor: API do Google (Gemini), pelo endereço compatível com a OpenAI.
// A chave fica no segredo `GEMINI_API_KEY` das Edge Functions. Enquanto esse
// segredo não existir, as funções continuam usando o gateway antigo do
// Lovable (`LOVABLE_API_KEY`), para a troca não derrubar nada.
//
// Os modelos podem ser trocados sem publicar código, pelos segredos
// `GEMINI_MODELO_RAPIDO` e `GEMINI_MODELO_AVANCADO`.
//
// Este arquivo não usa nada do Deno fora de `lerConfiguracaoIA`, para a
// lógica poder ser testada pelo Vitest (src/lib/iaCompartilhada.test.ts).

export type NivelDoModelo = "rapido" | "avancado";

export interface ConfiguracaoIA {
  provedor: "google" | "lovable";
  url: string;
  chave: string;
  modelos: Record<NivelDoModelo, string>;
}

export interface PedidoIA {
  nivel: NivelDoModelo;
  system: string;
  user: string;
  /** Quando informado, a resposta vem como objeto JSON neste formato. */
  json_schema?: unknown;
}

/** Erro que as funções devolvem para o app: `status` HTTP, `codigo` e mensagem para a pessoa. */
export class ErroIA extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

const URL_GOOGLE = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const URL_LOVABLE = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Monta a configuração a partir dos segredos. Com `GEMINI_API_KEY`, usa o Google. */
export function configuracaoIA(segredos: Record<string, string | undefined>): ConfiguracaoIA {
  const chaveGoogle = segredos.GEMINI_API_KEY?.trim();
  if (chaveGoogle) {
    return {
      provedor: "google",
      url: URL_GOOGLE,
      chave: chaveGoogle,
      modelos: {
        rapido: segredos.GEMINI_MODELO_RAPIDO?.trim() || "gemini-2.5-flash",
        avancado: segredos.GEMINI_MODELO_AVANCADO?.trim() || "gemini-2.5-pro",
      },
    };
  }
  const chaveLovable = segredos.LOVABLE_API_KEY?.trim();
  if (chaveLovable) {
    return {
      provedor: "lovable",
      url: URL_LOVABLE,
      chave: chaveLovable,
      modelos: { rapido: "google/gemini-2.5-flash", avancado: "google/gemini-2.5-pro" },
    };
  }
  throw new ErroIA(500, "ia_nao_configurada", "A IA não está configurada. Avise o suporte.");
}

/** Corpo do pedido no formato de chat da OpenAI. `comFormato: false` pede o JSON só pelo texto. */
export function montarCorpo(config: ConfiguracaoIA, pedido: PedidoIA, comFormato = true): Record<string, unknown> {
  const querJson = pedido.json_schema !== undefined;
  const instrucaoJson =
    querJson && !comFormato
      ? `\n\nResponda somente com um objeto JSON válido, sem texto antes ou depois, neste formato (JSON Schema):\n${JSON.stringify(pedido.json_schema)}`
      : "";
  const corpo: Record<string, unknown> = {
    model: config.modelos[pedido.nivel],
    messages: [
      { role: "system", content: pedido.system },
      { role: "user", content: pedido.user + instrucaoJson },
    ],
  };
  if (querJson && comFormato) {
    corpo.response_format = {
      type: "json_schema",
      json_schema: { name: "result", strict: true, schema: pedido.json_schema },
    };
  }
  return corpo;
}

/** Tira cercas de código e texto em volta e lê o objeto JSON. Nulo quando não há JSON. */
export function extrairJson(texto: string): unknown | null {
  const semCerca = texto.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  for (const candidato of [semCerca, semCerca.slice(semCerca.indexOf("{"), semCerca.lastIndexOf("}") + 1)]) {
    if (!candidato) continue;
    try {
      const valor = JSON.parse(candidato);
      if (valor && typeof valor === "object") return valor;
    } catch {
      // tenta o próximo candidato
    }
  }
  return null;
}

/** Traduz a falha do provedor em erro para o app, sem repassar detalhes internos nem a chave. */
export function erroDoProvedor(status: number, provedor: ConfiguracaoIA["provedor"]): ErroIA {
  if (status === 429) {
    return new ErroIA(429, "rate_limit", "Limite de uso da IA atingido. Tente novamente em alguns instantes.");
  }
  if (status === 402) {
    return new ErroIA(402, "payment_required", "O crédito da IA acabou. Avise o suporte.");
  }
  if (status === 401 || status === 403) {
    return new ErroIA(500, "ia_nao_configurada", "A chave da IA foi recusada. Avise o suporte.");
  }
  return new ErroIA(500, "ai_error", `A IA não respondeu agora (${provedor}, erro ${status}). Tente de novo em instantes.`);
}

type Buscar = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<Response>;

/**
 * Chama o modelo. Devolve `{ texto }` ou, com `json_schema`, o objeto lido
 * (ou `{ raw }` quando o modelo não devolveu JSON). Se o provedor recusar o
 * formato estruturado (erro 400), tenta de novo pedindo o JSON pelo texto.
 */
export async function chamarIA(
  config: ConfiguracaoIA,
  pedido: PedidoIA,
  buscar: Buscar = fetch as unknown as Buscar,
): Promise<Record<string, unknown>> {
  const enviar = (comFormato: boolean) =>
    buscar(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.chave}`, "Content-Type": "application/json" },
      body: JSON.stringify(montarCorpo(config, pedido, comFormato)),
    });

  const querJson = pedido.json_schema !== undefined;
  let resposta = await enviar(true);
  if (resposta.status === 400 && querJson) {
    console.warn("[ia] formato estruturado recusado; pedindo JSON pelo texto");
    resposta = await enviar(false);
  }
  if (!resposta.ok) {
    console.error("[ia] falha do provedor", config.provedor, resposta.status, (await resposta.text()).slice(0, 500));
    throw erroDoProvedor(resposta.status, config.provedor);
  }

  const dados = await resposta.json();
  const conteudo: string = dados?.choices?.[0]?.message?.content ?? "";
  if (!querJson) return { texto: conteudo };
  const lido = extrairJson(conteudo);
  return (lido as Record<string, unknown> | null) ?? { raw: conteudo };
}

/** Lê os segredos da Edge Function. Único ponto que depende do Deno. */
export function lerConfiguracaoIA(): ConfiguracaoIA {
  // deno-lint-ignore no-explicit-any
  const env = (globalThis as any).Deno?.env;
  return configuracaoIA({
    GEMINI_API_KEY: env?.get("GEMINI_API_KEY"),
    GEMINI_MODELO_RAPIDO: env?.get("GEMINI_MODELO_RAPIDO"),
    GEMINI_MODELO_AVANCADO: env?.get("GEMINI_MODELO_AVANCADO"),
    LOVABLE_API_KEY: env?.get("LOVABLE_API_KEY"),
  });
}
