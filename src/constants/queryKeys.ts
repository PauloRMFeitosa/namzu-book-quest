export const queryKeys = {
  clubes: {
    all: ["clubes-ativos"] as const,
    detail: (id: string) => ["clube", id] as const,
    posts: (id: string) => ["clube-posts", id] as const,
    membros: (userId: string) => ["meus-clubes-ids", userId] as const,
    meus: ["meus-clubes"] as const,
    convite: (id: string) => ["clube-convite", id] as const,
    visaoGeral: (id: string) => ["clube-visao-geral", id] as const,
    historico: (id: string) => ["clube-painel-historico", id] as const,
    metas: (id: string) => ["clube-metas-leitura", id] as const,
    votacaoData: (id: string) => ["clube-votacao-data", id] as const,
    avisos: (id: string) => ["clube-avisos", id] as const,
    obraParaTrilha: (obraId: string) => ["obra-para-trilha", obraId] as const,
    paginasDasObras: (obraIds: string[]) => ["obras-paginas", ...obraIds] as const,
  },
  admin: {
    errosApp: (dias: number) => ["admin-erros-app", dias] as const,
    painel: (dias: number) => ["admin-painel", dias] as const,
    planos: ["admin-planos"] as const,
    planosOrganizadores: ["admin-planos-organizadores"] as const,
  },
  acervo: {
    obras: ["acervo-obras"] as const,
  },
  eventos: {
    presencas: (eventoId: string) => ["evento-presencas", eventoId] as const,
    respostas: (eventoId: string) => ["evento-respostas", eventoId] as const,
    ata: (eventoId: string) => ["evento-ata", eventoId] as const,
  },
  perfil: {
    atividadeAnual: (userId: string) => ["atividade-anual", userId] as const,
    privacidade: (userId: string) => ["perfil-privacidade", userId] as const,
  },
  gamificacao: {
    perfil: (userId: string) => ["gamificacao", userId] as const,
    clube: (clubeId: string) => ["gamificacao-clube", clubeId] as const,
    missoesDiarias: (userId: string) => ["missoes-diarias", userId] as const,
  },
} as const;
