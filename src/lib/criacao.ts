// Validação e montagem dos dados das páginas de criação do clube: o próprio
// clube, o encontro e o conteúdo. Lógica pura, testável sem React.

const ehLink = (texto: string) => {
  try {
    const url = new URL(texto);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

/** Lê o rascunho guardado, aceitando só os campos conhecidos e do tipo certo. */
export function lerRascunho<T extends object>(chave: string, vazio: T): T {
  try {
    const guardado = JSON.parse(localStorage.getItem(chave) ?? "null");
    if (!guardado || typeof guardado !== "object" || Array.isArray(guardado)) return vazio;
    const resultado = { ...vazio } as Record<string, unknown>;
    for (const [campo, padrao] of Object.entries(vazio)) {
      const valor = guardado[campo];
      if (valor !== undefined && typeof valor === typeof padrao) resultado[campo] = valor;
    }
    return resultado as T;
  } catch {
    return vazio;
  }
}

// ---------- Clube ----------

export interface NovoClube {
  nome: string;
  descricao: string;
  objetivo: string;
  categoria: string;
  visibilidade: string;
  imagem_capa_url: string;
}

export const CLUBE_VAZIO: NovoClube = {
  nome: "",
  descricao: "",
  objetivo: "",
  categoria: "",
  visibilidade: "publico",
  imagem_capa_url: "",
};

export const MAXIMO_NOME_CLUBE = 80;

export function validarNovoClube(clube: NovoClube): string | null {
  const nome = clube.nome.trim();
  if (!nome) return "Dê um nome ao clube.";
  if (nome.length < 3) return "O nome do clube precisa de pelo menos 3 letras.";
  if (nome.length > MAXIMO_NOME_CLUBE) return `O nome do clube passou de ${MAXIMO_NOME_CLUBE} letras.`;
  if (clube.visibilidade !== "publico" && clube.visibilidade !== "privado") return "Escolha quem pode entrar no clube.";
  return null;
}

/** O que a visibilidade significa na prática, para o organizador escolher sabendo. */
export function explicarVisibilidade(visibilidade: string): string {
  return visibilidade === "privado"
    ? "Só entra quem recebe o link, e você aprova cada pedido."
    : "Aparece na lista de clubes e qualquer pessoa pode entrar.";
}

// ---------- Encontro ----------

export interface NovoEncontro {
  titulo: string;
  descricao: string;
  tipo: string;
  /** Valor de um campo datetime-local: "AAAA-MM-DDTHH:MM". Vazio quando não informado. */
  inicio: string;
  fim: string;
  url: string;
  limite: string;
}

export const ENCONTRO_VAZIO: NovoEncontro = {
  titulo: "",
  descricao: "",
  tipo: "encontro",
  inicio: "",
  fim: "",
  url: "",
  limite: "",
};

export const TIPOS_DE_ENCONTRO: { value: string; label: string }[] = [
  { value: "encontro", label: "Encontro" },
  { value: "live", label: "Live" },
  { value: "workshop", label: "Workshop" },
  { value: "leitura_coletiva", label: "Leitura coletiva" },
];

const lerMomento = (texto: string): Date | null => {
  if (!texto) return null;
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
};

export function validarNovoEncontro(encontro: NovoEncontro, agora: Date = new Date()): string | null {
  if (!encontro.titulo.trim()) return "Dê um título ao encontro.";
  if (encontro.titulo.trim().length > 120) return "O título passou de 120 letras.";
  const inicio = lerMomento(encontro.inicio);
  if (!inicio) return "Informe o dia e a hora do encontro.";
  if (inicio.getTime() < agora.getTime()) return "O encontro precisa começar no futuro.";
  if (encontro.fim) {
    const fim = lerMomento(encontro.fim);
    if (!fim) return "A hora de término não é válida.";
    if (fim.getTime() <= inicio.getTime()) return "O término precisa ser depois do início.";
  }
  if (encontro.url.trim() && !ehLink(encontro.url.trim())) return "O link precisa começar com https://";
  if (encontro.limite.trim()) {
    const limite = Number(encontro.limite);
    if (!Number.isInteger(limite) || limite < 1) return "O limite de participantes precisa ser um número a partir de 1.";
  }
  return null;
}

/** Os dados do encontro no formato da tabela `eventos`. Só chamar depois de validar. */
export function montarEncontro(encontro: NovoEncontro) {
  return {
    titulo: encontro.titulo.trim(),
    descricao: encontro.descricao.trim() || undefined,
    tipo: encontro.tipo,
    inicio_em: new Date(encontro.inicio).toISOString(),
    fim_em: encontro.fim ? new Date(encontro.fim).toISOString() : null,
    url_evento: encontro.url.trim() || null,
    limite_participantes: encontro.limite.trim() ? Number(encontro.limite) : null,
  };
}

// ---------- Conteúdo ----------

export interface NovoConteudo {
  titulo: string;
  descricao: string;
  tipo: string;
  url_conteudo: string;
  liberado_apos_dias: string;
}

export const CONTEUDO_VAZIO: NovoConteudo = {
  titulo: "",
  descricao: "",
  tipo: "video",
  url_conteudo: "",
  liberado_apos_dias: "0",
};

export const TIPOS_DE_CONTEUDO: { value: string; label: string }[] = [
  { value: "video", label: "Vídeo" },
  { value: "live_gravada", label: "Live gravada" },
  { value: "pdf", label: "PDF" },
  { value: "texto", label: "Texto" },
  { value: "link", label: "Link externo" },
  { value: "audio", label: "Áudio" },
];

export function validarNovoConteudo(conteudo: NovoConteudo): string | null {
  if (!conteudo.titulo.trim()) return "Dê um título ao conteúdo.";
  if (conteudo.titulo.trim().length > 160) return "O título passou de 160 letras.";
  if (!conteudo.url_conteudo.trim()) return "Informe o link do conteúdo.";
  if (!ehLink(conteudo.url_conteudo.trim())) return "O link precisa começar com https://";
  const dias = Number(conteudo.liberado_apos_dias || "0");
  if (!Number.isInteger(dias) || dias < 0) return "Os dias de espera precisam ser um número a partir de 0.";
  return null;
}

/** "Liberado assim que a pessoa entra no clube" ou "Liberado 7 dias depois que a pessoa entra no clube". */
export function explicarLiberacao(diasTexto: string): string {
  const dias = Number(diasTexto || "0");
  if (!Number.isInteger(dias) || dias <= 0) return "Liberado assim que a pessoa entra no clube.";
  return dias === 1
    ? "Liberado 1 dia depois que a pessoa entra no clube."
    : `Liberado ${dias} dias depois que a pessoa entra no clube.`;
}

export function montarConteudo(conteudo: NovoConteudo, proximaOrdem: number) {
  return {
    titulo: conteudo.titulo.trim(),
    descricao: conteudo.descricao.trim() || undefined,
    tipo: conteudo.tipo,
    url_conteudo: conteudo.url_conteudo.trim(),
    ordem_liberacao: proximaOrdem,
    liberado_apos_dias: Number(conteudo.liberado_apos_dias || "0"),
  };
}
