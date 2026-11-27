// Validação e montagem dos dados das páginas de criação do clube: o próprio
// clube, o encontro e o conteúdo. Lógica pura, testável sem React.

import { validarEndereco } from "@/lib/enderecoClube";

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
  /** Endereço da página pública (namzu.com.br/c/<endereco>). */
  endereco: string;
}

export const CLUBE_VAZIO: NovoClube = {
  nome: "",
  descricao: "",
  objetivo: "",
  categoria: "",
  visibilidade: "publico",
  imagem_capa_url: "",
  endereco: "",
};

export const MAXIMO_NOME_CLUBE = 80;

export function validarNovoClube(clube: NovoClube): string | null {
  const nome = clube.nome.trim();
  if (!nome) return "Dê um nome ao clube.";
  if (nome.length < 3) return "O nome do clube precisa de pelo menos 3 letras.";
  if (nome.length > MAXIMO_NOME_CLUBE) return `O nome do clube passou de ${MAXIMO_NOME_CLUBE} letras.`;
  if (clube.visibilidade !== "publico" && clube.visibilidade !== "privado") return "Escolha quem pode entrar no clube.";
  const erroDoEndereco = validarEndereco(clube.endereco);
  if (erroDoEndereco) return `Endereço da página: ${erroDoEndereco.charAt(0).toLowerCase()}${erroDoEndereco.slice(1)}`;
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

// ---------- Canal ----------

export interface NovoCanal {
  nome: string;
  descricao: string;
}

export const CANAL_VAZIO: NovoCanal = { nome: "", descricao: "" };
export const MAXIMO_NOME_CANAL = 40;

/** Nome de canal no formato "discussao-geral": minúsculas, sem acento, hífen no lugar de espaço. */
export function normalizarNomeCanal(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, MAXIMO_NOME_CANAL);
}

export function validarNovoCanal(canal: NovoCanal, nomesExistentes: string[] = []): string | null {
  const nome = canal.nome.replace(/^-+|-+$/g, "");
  if (!nome) return "Dê um nome ao canal.";
  if (nome.length < 2) return "O nome do canal precisa de pelo menos 2 letras.";
  if (nomesExistentes.includes(nome)) return "Já existe um canal com esse nome neste clube.";
  if (canal.descricao.trim().length > 200) return "A descrição passou de 200 letras.";
  return null;
}

export function montarCanal(canal: NovoCanal) {
  return { nome: canal.nome.replace(/^-+|-+$/g, ""), descricao: canal.descricao.trim() };
}

// ---------- Microgrupo ----------

export interface NovoMicrogrupo {
  nome: string;
  descricao: string;
  tipo: string;
  limite: string;
  privado: boolean;
}

export const MICROGRUPO_VAZIO: NovoMicrogrupo = { nome: "", descricao: "", tipo: "fixo", limite: "10", privado: true };

export const TIPOS_DE_MICROGRUPO: { value: string; label: string; explicacao: string }[] = [
  { value: "fixo", label: "Fixo", explicacao: "As mesmas pessoas, sem prazo para acabar." },
  { value: "rotativo", label: "Rotativo", explicacao: "Os participantes mudam de tempos em tempos." },
  { value: "evento", label: "Por evento", explicacao: "Criado para um encontro ou uma leitura específica." },
];

export function validarNovoMicrogrupo(grupo: NovoMicrogrupo): string | null {
  const nome = grupo.nome.trim();
  if (!nome) return "Dê um nome ao microgrupo.";
  if (nome.length > 60) return "O nome passou de 60 letras.";
  if (grupo.descricao.trim().length > 280) return "A descrição passou de 280 letras.";
  const limite = Number(grupo.limite);
  if (!Number.isInteger(limite) || limite < 2 || limite > 50) return "O limite de membros precisa ficar entre 2 e 50.";
  return null;
}

export function montarMicrogrupo(grupo: NovoMicrogrupo) {
  return {
    nome: grupo.nome.trim(),
    descricao: grupo.descricao.trim() || undefined,
    tipo: grupo.tipo,
    limite_membros: Number(grupo.limite),
    privado: grupo.privado,
  };
}

// ---------- Aviso e votação de data (validação em avisos.ts e votacaoData.ts) ----------

export interface NovoAviso {
  titulo: string;
  mensagem: string;
}

export const AVISO_VAZIO: NovoAviso = { titulo: "", mensagem: "" };

export interface NovaVotacao {
  titulo: string;
  url: string;
  /** Datas no formato de campo datetime-local, separadas por "|", para caber no rascunho. */
  datas: string;
}

export const VOTACAO_VAZIA: NovaVotacao = { titulo: "", url: "", datas: "|" };

export const lerDatasDaVotacao = (datas: string): string[] => datas.split("|");
export const escreverDatasDaVotacao = (datas: string[]): string => datas.join("|");
