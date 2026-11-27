// Planos do organizador: catálogo de recursos, formulário do plano e
// comparação do uso de cada organizador com os limites (Admin > Planos).
// Nada aqui bloqueia o app; a aplicação dos limites vem numa etapa seguinte.

export type GrupoDeRecurso = "Clube" | "Comunidade" | "Gestão" | "Inteligência artificial" | "Página e marca" | "Receita";

export interface RecursoDoPlano {
  chave: string;
  rotulo: string;
  descricao: string;
  grupo: GrupoDeRecurso;
  /** Ainda não existe no app. Pode entrar no plano, mas só passa a valer quando for lançado. */
  emBreve?: boolean;
}

export const RECURSOS: RecursoDoPlano[] = [
  { chave: "trilha", rotulo: "Trilha de leitura", descricao: "Livros do clube, metas e cronograma.", grupo: "Clube" },
  { chave: "encontros", rotulo: "Encontros", descricao: "Agenda, confirmação, presença e ata.", grupo: "Clube" },
  { chave: "votacao_data", rotulo: "Votação de data", descricao: "Os membros votam na data do encontro.", grupo: "Clube" },
  { chave: "avisos", rotulo: "Avisos", descricao: "Aviso para todos os membros, com notificação.", grupo: "Clube" },
  { chave: "convite_link", rotulo: "Convite por link", descricao: "Link para entrar no clube.", grupo: "Clube" },
  { chave: "feed", rotulo: "Feed", descricao: "Publicações dos membros no clube.", grupo: "Comunidade" },
  { chave: "canais", rotulo: "Canais", descricao: "Conversas separadas por assunto.", grupo: "Comunidade" },
  { chave: "microgrupos", rotulo: "Microgrupos", descricao: "Grupos menores dentro do clube.", grupo: "Comunidade" },
  { chave: "conteudos", rotulo: "Conteúdos", descricao: "Materiais do organizador para os membros.", grupo: "Comunidade" },
  { chave: "ranking", rotulo: "Ranking do clube", descricao: "Pontuação e temporadas entre os membros.", grupo: "Comunidade" },
  { chave: "painel_pendencias", rotulo: "Painel: visão geral", descricao: "Indicadores e o que precisa de atenção.", grupo: "Gestão" },
  { chave: "painel_historico", rotulo: "Painel: histórico", descricao: "Participação por semana e últimos encontros.", grupo: "Gestão" },
  { chave: "exportacao", rotulo: "Exportação", descricao: "Lista de membros e presença em planilha.", grupo: "Gestão" },
  { chave: "ia_copiloto", rotulo: "Copiloto do organizador", descricao: "Assistente para conduzir o clube.", grupo: "Inteligência artificial" },
  { chave: "ia_provocacao", rotulo: "Perguntas para o encontro", descricao: "Sugestões de perguntas sobre o livro.", grupo: "Inteligência artificial" },
  { chave: "ia_resumo", rotulo: "Resumo das conversas", descricao: "Resumo do que foi discutido.", grupo: "Inteligência artificial" },
  { chave: "ia_recomendacoes", rotulo: "Sugestão de próximo livro", descricao: "Recomendações a partir do gosto do clube.", grupo: "Inteligência artificial" },
  { chave: "pagina_publica", rotulo: "Página pública do clube", descricao: "Página aberta para divulgar o clube, em namzu.com.br/c/nome.", grupo: "Página e marca" },
  { chave: "endereco_namzu", rotulo: "Endereço no NAMZU", descricao: "Página do clube em nome-do-clube.namzu.com.br.", grupo: "Página e marca" },
  { chave: "pagina_personalizada", rotulo: "Página personalizada", descricao: "Capa, cores e textos próprios.", grupo: "Página e marca", emBreve: true },
  { chave: "sem_marca_namzu", rotulo: "Sem a marca NAMZU", descricao: "A página pública sai sem a marca do NAMZU.", grupo: "Página e marca", emBreve: true },
  { chave: "dominio_proprio", rotulo: "Endereço próprio", descricao: "Página do clube no domínio do organizador.", grupo: "Página e marca", emBreve: true },
  { chave: "mensalidade", rotulo: "Cobrar mensalidade", descricao: "O organizador cobra dos membros por PIX ou cartão.", grupo: "Receita", emBreve: true },
];

export const GRUPOS_DE_RECURSO: GrupoDeRecurso[] = [
  "Clube",
  "Comunidade",
  "Gestão",
  "Inteligência artificial",
  "Página e marca",
  "Receita",
];

/** Linha da tabela `planos`. */
export interface Plano {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  preco_mensal_centavos: number;
  preco_anual_centavos: number | null;
  dias_de_teste: number;
  limite_membros: number | null;
  limite_clubes: number | null;
  limite_co_curadores: number | null;
  limite_ia_mes: number | null;
  recursos: string[];
  publicado: boolean;
  destaque: boolean;
  padrao: boolean;
  ordem: number;
  arquivado_em: string | null;
}

export type DadosDoPlano = Omit<Plano, "id" | "arquivado_em">;

/** Formulário do plano. Campo de número fica como texto; vazio em limite quer dizer "sem limite". */
export interface FormularioDoPlano {
  nome: string;
  chave: string;
  descricao: string;
  precoMensal: string;
  precoAnual: string;
  diasDeTeste: string;
  limiteMembros: string;
  limiteClubes: string;
  limiteCoCuradores: string;
  limiteIaMes: string;
  recursos: string[];
  publicado: boolean;
  destaque: boolean;
  padrao: boolean;
  ordem: string;
}

export const PLANO_VAZIO: FormularioDoPlano = {
  nome: "",
  chave: "",
  descricao: "",
  precoMensal: "",
  precoAnual: "",
  diasDeTeste: "",
  limiteMembros: "",
  limiteClubes: "",
  limiteCoCuradores: "",
  limiteIaMes: "",
  recursos: [],
  publicado: false,
  destaque: false,
  padrao: false,
  ordem: "",
};

export const MAXIMO_NOME_PLANO = 60;
export const MAXIMO_DESCRICAO_PLANO = 300;

/** "Clube do Livro Pró" → "clube-do-livro-pro". */
export function chaveDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** "19,90" → 1990. Vazio vira null; texto que não é valor vira NaN. */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(limpo)) return NaN;
  return Math.round(parseFloat(limpo.replace(",", ".")) * 100);
}

export function textoDosCentavos(centavos: number | null): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function formatarPreco(centavos: number): string {
  if (centavos === 0) return "Grátis";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Inteiro de um campo de texto. Vazio vira null; inválido vira NaN. */
function inteiroDoTexto(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  return /^\d{1,6}$/.test(limpo) ? parseInt(limpo, 10) : NaN;
}

const invalido = (n: number | null) => n !== null && Number.isNaN(n);

/** Primeiro problema do formulário, ou null se pode salvar. */
export function validarPlano(form: FormularioDoPlano, chavesEmUso: string[] = []): string | null {
  const nome = form.nome.trim();
  if (!nome) return "Dê um nome ao plano.";
  if (nome.length > MAXIMO_NOME_PLANO) return `O nome pode ter até ${MAXIMO_NOME_PLANO} caracteres.`;
  const chave = form.chave.trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(chave) || chave.length < 2 || chave.length > 40) {
    return "O identificador usa só letras minúsculas, números e hífen, com 2 a 40 caracteres.";
  }
  if (chavesEmUso.includes(chave)) return "Já existe um plano com esse identificador.";
  if (form.descricao.trim().length > MAXIMO_DESCRICAO_PLANO) {
    return `A descrição pode ter até ${MAXIMO_DESCRICAO_PLANO} caracteres.`;
  }
  if (invalido(centavosDoTexto(form.precoMensal))) return "Preço mensal inválido. Use o formato 19,90.";
  if (invalido(centavosDoTexto(form.precoAnual))) return "Preço anual inválido. Use o formato 199,00.";
  const teste = inteiroDoTexto(form.diasDeTeste);
  if (invalido(teste) || (teste ?? 0) > 90) return "Os dias de teste vão de 0 a 90.";
  const membros = inteiroDoTexto(form.limiteMembros);
  if (invalido(membros) || membros === 0) return "O limite de membros é um número maior que zero, ou vazio para sem limite.";
  const clubes = inteiroDoTexto(form.limiteClubes);
  if (invalido(clubes) || clubes === 0) return "O limite de clubes é um número maior que zero, ou vazio para sem limite.";
  if (invalido(inteiroDoTexto(form.limiteCoCuradores))) return "O limite de co-curadores é um número, ou vazio para sem limite.";
  if (invalido(inteiroDoTexto(form.limiteIaMes))) return "O limite de usos de IA é um número, ou vazio para sem limite.";
  if (invalido(inteiroDoTexto(form.ordem))) return "A ordem é um número.";
  return null;
}

/** Dados prontos para gravar. Chame só depois de `validarPlano` devolver null. */
export function montarPlano(form: FormularioDoPlano): DadosDoPlano {
  const conhecidos = new Set(RECURSOS.map((r) => r.chave));
  return {
    chave: form.chave.trim(),
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    preco_mensal_centavos: centavosDoTexto(form.precoMensal) ?? 0,
    preco_anual_centavos: centavosDoTexto(form.precoAnual),
    dias_de_teste: inteiroDoTexto(form.diasDeTeste) ?? 0,
    limite_membros: inteiroDoTexto(form.limiteMembros),
    limite_clubes: inteiroDoTexto(form.limiteClubes),
    limite_co_curadores: inteiroDoTexto(form.limiteCoCuradores),
    limite_ia_mes: inteiroDoTexto(form.limiteIaMes),
    recursos: RECURSOS.filter((r) => form.recursos.includes(r.chave) && conhecidos.has(r.chave)).map((r) => r.chave),
    publicado: form.publicado,
    destaque: form.destaque,
    padrao: form.padrao,
    ordem: inteiroDoTexto(form.ordem) ?? 0,
  };
}

const texto = (n: number | null) => (n === null || n === undefined ? "" : String(n));

export function planoParaFormulario(plano: Plano): FormularioDoPlano {
  return {
    nome: plano.nome,
    chave: plano.chave,
    descricao: plano.descricao ?? "",
    precoMensal: plano.preco_mensal_centavos ? textoDosCentavos(plano.preco_mensal_centavos) : "",
    precoAnual: textoDosCentavos(plano.preco_anual_centavos),
    diasDeTeste: plano.dias_de_teste ? String(plano.dias_de_teste) : "",
    limiteMembros: texto(plano.limite_membros),
    limiteClubes: texto(plano.limite_clubes),
    limiteCoCuradores: texto(plano.limite_co_curadores),
    limiteIaMes: texto(plano.limite_ia_mes),
    recursos: plano.recursos ?? [],
    publicado: plano.publicado,
    destaque: plano.destaque,
    padrao: plano.padrao,
    ordem: plano.ordem ? String(plano.ordem) : "",
  };
}

/** "Até 30 membros por clube", "Membros sem limite". */
export function textoDoLimite(limite: number | null, singular: string, plural: string, complemento = ""): string {
  const fim = complemento ? ` ${complemento}` : "";
  if (limite === null || limite === undefined) return `${plural.charAt(0).toUpperCase()}${plural.slice(1)} sem limite`;
  if (limite === 0) return `Sem ${plural}`;
  return `Até ${limite.toLocaleString("pt-BR")} ${limite === 1 ? singular : plural}${fim}`;
}

export function limitesDoPlano(plano: Pick<Plano, "limite_membros" | "limite_clubes" | "limite_co_curadores" | "limite_ia_mes">): string[] {
  return [
    textoDoLimite(plano.limite_membros, "membro", "membros", "por clube"),
    textoDoLimite(plano.limite_clubes, "clube", "clubes"),
    textoDoLimite(plano.limite_co_curadores, "co-curador", "co-curadores", "por clube"),
    textoDoLimite(plano.limite_ia_mes, "uso de IA", "usos de IA", "por mês"),
  ];
}

/** Desconto do plano anual em relação a 12 mensalidades, em %. Null quando não há o que comparar. */
export function descontoAnual(mensal: number, anual: number | null): number | null {
  if (!mensal || anual === null || anual === undefined) return null;
  const cheio = mensal * 12;
  if (anual >= cheio) return null;
  return Math.round(((cheio - anual) / cheio) * 100);
}

/** Planos em uso (não arquivados), na ordem de exibição. */
export function planosAtivos(planos: Plano[]): Plano[] {
  return planos
    .filter((p) => !p.arquivado_em)
    .sort((a, b) => a.ordem - b.ordem || a.preco_mensal_centavos - b.preco_mensal_centavos || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Linha da função `admin_planos_organizadores`. */
export interface OrganizadorComPlano {
  user_id: string;
  nome: string;
  clubes: number;
  maior_clube: number;
  co_curadores: number;
  plano_id: string | null;
  origem: string | null;
  valido_ate: string | null;
  observacao: string | null;
}

/** Plano que vale para o organizador: o atribuído, ou o padrão. */
export function planoDoOrganizador(organizador: Pick<OrganizadorComPlano, "plano_id">, planos: Plano[]): Plano | null {
  return planos.find((p) => p.id === organizador.plano_id) ?? planos.find((p) => p.padrao && !p.arquivado_em) ?? null;
}

/** O que o organizador usa acima do que o plano dele permite. Lista vazia quando cabe. */
export function excessosDoOrganizador(
  organizador: Pick<OrganizadorComPlano, "clubes" | "maior_clube" | "co_curadores">,
  plano: Plano | null,
): string[] {
  if (!plano) return [];
  const excessos: string[] = [];
  if (plano.limite_clubes !== null && organizador.clubes > plano.limite_clubes) {
    excessos.push(`${organizador.clubes} clubes (limite ${plano.limite_clubes})`);
  }
  if (plano.limite_membros !== null && organizador.maior_clube > plano.limite_membros) {
    excessos.push(`${organizador.maior_clube} membros no maior clube (limite ${plano.limite_membros})`);
  }
  if (plano.limite_co_curadores !== null && organizador.co_curadores > plano.limite_co_curadores) {
    excessos.push(`${organizador.co_curadores} co-curadores (limite ${plano.limite_co_curadores})`);
  }
  return excessos;
}

/** Quantos organizadores estão em cada plano, contando quem cai no padrão. */
export function organizadoresPorPlano(organizadores: OrganizadorComPlano[], planos: Plano[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const o of organizadores) {
    const plano = planoDoOrganizador(o, planos);
    if (plano) contagem[plano.id] = (contagem[plano.id] ?? 0) + 1;
  }
  return contagem;
}

export const ORIGENS_DO_PLANO: { valor: string; rotulo: string }[] = [
  { valor: "manual", rotulo: "Definido pelo admin" },
  { valor: "cortesia", rotulo: "Cortesia" },
  { valor: "piloto", rotulo: "Piloto" },
  { valor: "pagamento", rotulo: "Pagamento" },
];
