// Endereço público do clube: namzu.com.br/c/<endereco> e <endereco>.namzu.com.br.
// Lógica pura, testável sem React. As regras de formato e a lista de nomes
// reservados repetem as do banco (migração clube_pagina_publica).

export const DOMINIO_RAIZ = "namzu.com.br";
export const MINIMO_ENDERECO = 3;
export const MAXIMO_ENDERECO = 40;

export const ENDERECOS_RESERVADOS = [
  "www", "app", "api", "admin", "blog", "mail", "email", "ftp", "cdn", "static", "assets", "status", "dev", "teste", "staging", "docs",
  "namzu", "suporte", "ajuda", "contato", "login", "signup", "cadastro", "entrar", "sair", "conta", "perfil",
  "clube", "clubes", "convite", "painel", "planos", "precos", "pagamento", "loja", "termos", "privacidade", "sobre",
];

const FORMATO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** O que a pessoa digita vira algo próximo de um endereço: sem acento, espaço ou símbolo. */
export function limparEndereco(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, MAXIMO_ENDERECO);
}

/** Sugestão de endereço a partir do nome do clube: "Leitoras do Cariri" → "leitoras-do-cariri". */
export function sugerirEndereco(nome: string): string {
  const limpo = limparEndereco(nome).replace(/-+$/, "");
  if (limpo.length < MINIMO_ENDERECO || ENDERECOS_RESERVADOS.includes(limpo)) return limpo ? `clube-${limpo}`.slice(0, MAXIMO_ENDERECO).replace(/-+$/, "") : "";
  return limpo;
}

/** Primeiro problema do endereço, ou null se pode salvar. */
export function validarEndereco(endereco: string): string | null {
  const e = (endereco ?? "").trim();
  if (!e) return "Escolha um endereço para o clube.";
  if (e.length < MINIMO_ENDERECO) return `O endereço precisa de pelo menos ${MINIMO_ENDERECO} caracteres.`;
  if (e.length > MAXIMO_ENDERECO) return `O endereço pode ter até ${MAXIMO_ENDERECO} caracteres.`;
  if (!FORMATO.test(e)) return "Use só letras minúsculas, números e hífen, sem começar ou terminar com hífen.";
  if (ENDERECOS_RESERVADOS.includes(e)) return "Esse endereço é reservado. Escolha outro.";
  return null;
}

/**
 * Endereço do clube quando o site é aberto por subdomínio.
 * "leitoras.namzu.com.br" → "leitoras". Domínio principal, www, nomes
 * reservados e qualquer outro site devolvem null. Em desenvolvimento,
 * "leitoras.localhost" também vale.
 */
export function enderecoDoHost(hostname: string): string | null {
  const host = (hostname ?? "").toLowerCase().replace(/\.$/, "");
  const raiz = [DOMINIO_RAIZ, "localhost"].find((r) => host.endsWith(`.${r}`));
  if (!raiz) return null;
  const antes = host.slice(0, -(raiz.length + 1));
  if (!antes || antes.includes(".")) return null;
  return validarEndereco(antes) === null ? antes : null;
}

export const caminhoDaPagina = (endereco: string) => `/c/${endereco}`;

/** Endereço completo no domínio principal: https://namzu.com.br/c/leitoras. */
export const linkDaPagina = (endereco: string) => `https://${DOMINIO_RAIZ}${caminhoDaPagina(endereco)}`;

/** Endereço completo por subdomínio: https://leitoras.namzu.com.br. */
export const linkPorSubdominio = (endereco: string) => `https://${endereco}.${DOMINIO_RAIZ}`;

/** Sem o https://, para mostrar na tela. */
export const semProtocolo = (link: string) => link.replace(/^https?:\/\//, "");

/**
 * Link para uma rota do app a partir da página pública. No subdomínio a
 * pessoa precisa ir para o domínio principal, onde fica o login.
 */
export function linkParaOApp(caminho: string, noSubdominio: boolean, hostname = ""): string {
  if (!noSubdominio) return caminho;
  // Em desenvolvimento (leitoras.localhost) volta para o localhost da mesma porta.
  if (hostname.endsWith(".localhost")) return caminho;
  return `https://${DOMINIO_RAIZ}${caminho}`;
}

/** O que a função `clube_pagina_publica` devolve. */
export interface LivroDaPagina {
  titulo: string;
  autor: string | null;
  capa_url: string | null;
  lido?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface PaginaPublicaDoClube {
  id: string;
  endereco: string;
  nome: string;
  descricao: string | null;
  objetivo: string | null;
  categoria: string | null;
  imagem_capa_url: string | null;
  privado: boolean;
  criado_em: string | null;
  organizador: { nome: string | null; avatar_url: string | null; bio: string | null };
  membros: number;
  livro_atual: LivroDaPagina | null;
  livros: LivroDaPagina[];
  encontros: { titulo: string; inicio_em: string; tipo: string | null }[];
}

/** "12 de dezembro, sexta-feira, às 19h30", no fuso de quem está vendo. */
export function quandoDoEncontro(iso: string, fuso?: string): string {
  const data = new Date(iso);
  const opcoes = fuso ? { timeZone: fuso } : {};
  const dia = data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", ...opcoes });
  const semana = data.toLocaleDateString("pt-BR", { weekday: "long", ...opcoes });
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", ...opcoes }).replace(":", "h").replace(/h00$/, "h");
  return `${dia}, ${semana}, às ${hora}`;
}

/** "1 membro", "32 membros". */
export const textoDeMembros = (n: number) => (n === 1 ? "1 membro" : `${n.toLocaleString("pt-BR")} membros`);

/** Texto curto para a descrição da página nos buscadores e no compartilhamento. */
export function resumoDaPagina(pagina: Pick<PaginaPublicaDoClube, "nome" | "descricao" | "livro_atual">): string {
  const base = (pagina.descricao ?? "").replace(/\s+/g, " ").trim();
  if (base) return base.length > 160 ? `${base.slice(0, 157).trimEnd()}...` : base;
  if (pagina.livro_atual) return `${pagina.nome} é um clube de leitura no NAMZU. Lendo agora: ${pagina.livro_atual.titulo}.`;
  return `${pagina.nome} é um clube de leitura no NAMZU.`;
}
