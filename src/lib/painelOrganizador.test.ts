import { describe, expect, it } from "vitest";
import {
  avisosPorSecao,
  participacaoDaSemana,
  pendenciasDoClube,
  serieDeParticipacao,
  textoDaPresenca,
  type HistoricoDoClube,
} from "./painelOrganizador";
import type { MembroVisaoGeral, VisaoGeralClube } from "./visaoGeral";

const membro = (extra: Partial<MembroVisaoGeral> = {}): MembroVisaoGeral => ({
  user_id: "u1",
  nome: "Bia",
  avatar_url: null,
  papel: "membro",
  organizador: false,
  percentual: 60,
  status_leitura: "lendo",
  ultima_atividade: null,
  parado: false,
  rsvp: "confirmado",
  ...extra,
});

const emDia: VisaoGeralClube = {
  livro_atual: { obra_id: "o1", trilha_id: "t1", titulo: "Torto Arado", capa_url: null, data_inicio: null, data_fim: null },
  meta_atual: { id: "m1", titulo: "Semana 2", percentual_alvo: 50, data_limite: "2026-12-05" },
  proximo_encontro: { id: "e1", titulo: "Encontro", inicio_em: "2026-12-05T22:30:00Z", url_evento: null, confirmados: 3, talvez: 0, recusados: 0, sem_resposta: 0 },
  pedidos_pendentes: 0,
  membros_ativos: 3,
  parados: 0,
  membros: [membro(), membro({ user_id: "u2" })],
};

const historico: HistoricoDoClube = {
  semanas: [
    { inicio: "2026-11-16", leitores: 2, participantes: 3, membros: 6 },
    { inicio: "2026-11-23", leitores: 1, participantes: 4, membros: 8 },
  ],
  encontros: [],
};

describe("pendenciasDoClube", () => {
  it("fica vazia com o clube em dia", () => {
    expect(pendenciasDoClube(emDia, historico)).toEqual([]);
  });

  it("clube recém-criado: pede livro e encontro", () => {
    const lista = pendenciasDoClube({ ...emDia, livro_atual: null, meta_atual: null, proximo_encontro: null, membros: [] });
    expect(lista.map((p) => p.texto)).toEqual(["O clube ainda não tem livro na trilha", "Nenhum encontro marcado"]);
    expect(lista.map((p) => p.secao)).toEqual(["leitura", "encontros"]);
  });

  it("votação de data aberta conta como encontro encaminhado", () => {
    const lista = pendenciasDoClube({ ...emDia, proximo_encontro: null }, null, { votacaoAberta: true });
    expect(lista).toEqual([]);
  });

  it("lista tudo o que pede atenção, com singular e plural", () => {
    const lista = pendenciasDoClube(
      {
        ...emDia,
        meta_atual: { ...emDia.meta_atual!, percentual_alvo: 80 },
        pedidos_pendentes: 1,
        parados: 2,
        proximo_encontro: { ...emDia.proximo_encontro!, sem_resposta: 4 },
        membros: [membro({ percentual: 10 }), membro({ user_id: "u2", status_leitura: "concluido", percentual: 100 })],
      },
      {
        ...historico,
        encontros: [
          { id: "a", titulo: "Novembro", inicio_em: "2026-11-20T22:00:00Z", confirmados: 5, presentes: 4, tem_ata: false },
          { id: "b", titulo: "Outubro", inicio_em: "2026-10-20T22:00:00Z", confirmados: 3, presentes: 0, tem_ata: false },
        ],
      },
    );
    expect(lista.map((p) => p.texto)).toEqual([
      "1 pessoa pediu para entrar",
      "4 membros ainda não responderam ao próximo encontro",
      "1 membro está abaixo da meta de leitura",
      "2 membros parados há mais de 7 dias",
      "1 encontro realizado sem ata",
      "1 encontro passado sem lista de presença",
    ]);
  });

  it("livro sem meta em aberto pede cronograma", () => {
    const lista = pendenciasDoClube({ ...emDia, meta_atual: null });
    expect(lista[0]).toMatchObject({ texto: '"Torto Arado" está sem meta de leitura em aberto', secao: "leitura" });
  });
});

describe("apoio", () => {
  it("conta pendências por seção, sem a visão geral", () => {
    expect(
      avisosPorSecao([
        { texto: "a", acao: "", secao: "membros" },
        { texto: "b", acao: "", secao: "membros" },
        { texto: "c", acao: "", secao: "visao" },
        { texto: "d", acao: "", secao: "encontros" },
      ]),
    ).toEqual({ membros: 2, encontros: 1 });
  });

  it("monta a série e a participação da semana", () => {
    expect(serieDeParticipacao(historico)).toEqual([
      { dia: "2026-11-16", total: 3 },
      { dia: "2026-11-23", total: 4 },
    ]);
    expect(serieDeParticipacao(null)).toEqual([]);
    expect(participacaoDaSemana(historico)).toBe(50);
    expect(participacaoDaSemana({ semanas: [{ inicio: "2026-11-23", leitores: 0, participantes: 0, membros: 0 }], encontros: [] })).toBeNull();
    expect(participacaoDaSemana(null)).toBeNull();
  });

  it("escreve a presença", () => {
    expect(textoDaPresenca({ confirmados: 3, presentes: 0 })).toBe("Presença não marcada");
    expect(textoDaPresenca({ confirmados: 3, presentes: 1 })).toBe("1 presente");
    expect(textoDaPresenca({ confirmados: 3, presentes: 4 })).toBe("4 presentes");
  });
});
