// Monitoramento de erros do app (Fase 0). Lógica pura, testável sem
// navegador: descrever o erro, decidir se é ruído, agrupar e limitar.

export type OrigemDoErro = "erro" | "promessa" | "react" | "consulta";

export const MAXIMO_MENSAGEM = 500;
export const MAXIMO_PILHA = 4000;
/** Erros enviados por sessão do navegador. O banco ainda limita por hora. */
export const MAXIMO_POR_SESSAO = 20;

export interface ErroDescrito {
  mensagem: string;
  pilha: string | null;
}

/** Transforma qualquer coisa lançada (Error, objeto do Supabase, texto) em mensagem e pilha. */
export function descreverErro(valor: unknown): ErroDescrito {
  if (valor instanceof Error) {
    const nome = valor.name && valor.name !== "Error" ? `${valor.name}: ` : "";
    return { mensagem: cortar(`${nome}${valor.message || "erro sem mensagem"}`, MAXIMO_MENSAGEM), pilha: cortarPilha(valor.stack) };
  }
  if (typeof valor === "string") return { mensagem: cortar(valor || "erro sem mensagem", MAXIMO_MENSAGEM), pilha: null };
  if (valor && typeof valor === "object") {
    const o = valor as { message?: unknown; code?: unknown; stack?: unknown };
    const mensagem = typeof o.message === "string" && o.message ? o.message : "erro sem mensagem";
    const codigo = typeof o.code === "string" && o.code ? ` [${o.code}]` : "";
    return { mensagem: cortar(`${mensagem}${codigo}`, MAXIMO_MENSAGEM), pilha: cortarPilha(typeof o.stack === "string" ? o.stack : null) };
  }
  return { mensagem: "erro sem mensagem", pilha: null };
}

const cortar = (texto: string, maximo: number) => (texto.length > maximo ? texto.slice(0, maximo) : texto);
const cortarPilha = (pilha: string | null | undefined) => (pilha ? cortar(pilha, MAXIMO_PILHA) : null);

const RUIDOS = [
  /ResizeObserver loop/i, // aviso do navegador, sem efeito para a pessoa
  /^Script error\.?$/i, // erro de script de outro site, sem detalhe
  /Failed to fetch dynamically imported module/i, // versão nova publicada; o app recarrega sozinho
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to fetch/i, // sem rede
  /NetworkError when attempting to fetch/i,
  /Load failed/i, // sem rede no Safari
  /AbortError/i, // pedido cancelado ao sair da tela
  /JWT expired/i, // sessão vencida; o app renova
];

/** Erros que não dizem nada sobre defeito do app: sem rede, extensão do navegador, versão trocada. */
export function ehRuido(erro: ErroDescrito): boolean {
  if (RUIDOS.some((r) => r.test(erro.mensagem))) return true;
  return !!erro.pilha && /(chrome|moz|safari-web)-extension:\/\//.test(erro.pilha);
}

/** Tira o que muda a cada ocorrência (ids, números), para erros iguais ficarem com a mesma assinatura. */
export function normalizarMensagem(mensagem: string): string {
  return mensagem
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\d+/g, "0")
    .trim();
}

/** Assinatura curta e estável do erro, para agrupar ocorrências iguais. */
export function assinaturaDoErro(origem: OrigemDoErro, mensagem: string): string {
  const texto = `${origem}|${normalizarMensagem(mensagem)}`;
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) hash = ((hash << 5) + hash + texto.charCodeAt(i)) >>> 0;
  return hash.toString(36).padStart(4, "0");
}

/** Rota sem parâmetros e sem ids: "/clubes/:id/eventos/novo". */
export function limparRota(caminho: string): string {
  return cortar(
    caminho
      .split(/[?#]/)[0]
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
      .replace(/\/\d+(?=\/|$)/g, "/:id"),
    200,
  );
}

export function ambienteDoApp(hostname: string): "producao" | "preview" {
  return hostname === "namzu.com.br" || hostname === "www.namzu.com.br" ? "producao" : "preview";
}

/**
 * Decide se um erro ainda pode ser enviado nesta sessão: cada assinatura vai
 * uma vez só, até o máximo da sessão.
 */
export function criarLimitador(maximo: number = MAXIMO_POR_SESSAO) {
  const enviadas = new Set<string>();
  return (assinatura: string): boolean => {
    if (enviadas.has(assinatura) || enviadas.size >= maximo) return false;
    enviadas.add(assinatura);
    return true;
  };
}

export interface ErroRegistrado {
  id: number;
  criado_em: string;
  user_id: string | null;
  origem: string;
  assinatura: string;
  mensagem: string;
  pilha: string | null;
  rota: string | null;
  versao: string | null;
  ambiente: string;
  navegador: string | null;
}

export interface GrupoDeErros {
  assinatura: string;
  origem: string;
  mensagem: string;
  ocorrencias: number;
  pessoas: number;
  primeira: string;
  ultima: string;
  rotas: string[];
  versoes: string[];
  /** A ocorrência mais recente, para ver pilha e navegador. */
  exemplo: ErroRegistrado;
}

/** Agrupa as ocorrências por assinatura, do grupo mais recente para o mais antigo. */
export function agruparErros(erros: ErroRegistrado[]): GrupoDeErros[] {
  const grupos = new Map<string, { itens: ErroRegistrado[] }>();
  for (const e of erros) {
    const grupo = grupos.get(e.assinatura) ?? { itens: [] };
    grupo.itens.push(e);
    grupos.set(e.assinatura, grupo);
  }
  const unicos = (valores: (string | null)[]) => [...new Set(valores.filter((v): v is string => !!v))];
  return [...grupos.entries()]
    .map(([assinatura, { itens }]) => {
      const ordenados = [...itens].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
      const exemplo = ordenados[0];
      return {
        assinatura,
        origem: exemplo.origem,
        mensagem: exemplo.mensagem,
        ocorrencias: itens.length,
        pessoas: unicos(itens.map((i) => i.user_id)).length,
        primeira: ordenados[ordenados.length - 1].criado_em,
        ultima: exemplo.criado_em,
        rotas: unicos(itens.map((i) => i.rota)).slice(0, 5),
        versoes: unicos(itens.map((i) => i.versao)).slice(0, 5),
        exemplo,
      };
    })
    .sort((a, b) => b.ultima.localeCompare(a.ultima));
}

export const ROTULO_DA_ORIGEM: Record<string, string> = {
  erro: "Erro não tratado",
  promessa: "Promessa rejeitada",
  react: "Tela quebrou",
  consulta: "Consulta falhou",
};
