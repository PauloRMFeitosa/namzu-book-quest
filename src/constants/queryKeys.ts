export const queryKeys = {
  clubes: {
    all: ["clubes-ativos"] as const,
    detail: (id: string) => ["clube", id] as const,
    posts: (id: string) => ["clube-posts", id] as const,
    membros: (userId: string) => ["meus-clubes-ids", userId] as const,
    meus: ["meus-clubes"] as const,
  },
  perfil: {
    atividadeAnual: (userId: string) => ["atividade-anual", userId] as const,
    privacidade: (userId: string) => ["perfil-privacidade", userId] as const,
  },
  gamificacao: {
    perfil: (userId: string) => ["gamificacao", userId] as const,
    clube: (clubeId: string) => ["gamificacao-clube", clubeId] as const,
    missoesDiarias: (userId: string) => ["missoes-diarias", userId] as const,
    metaDiaria: (userId: string) => ["meta-diaria", userId] as const,
  },
} as const;
