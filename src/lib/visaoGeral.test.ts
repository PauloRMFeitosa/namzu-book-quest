import { describe, it, expect } from "vitest";
import {
  filtrarMembros,
  resumoLeitura,
  resumoRespostas,
  rotuloUltimaAtividade,
  textoResumoLeitura,
  type MembroVisaoGeral,
} from "@/lib/visaoGeral";

const membro = (extra: Partial<MembroVisaoGeral>): MembroVisaoGeral => ({
  user_id: "u", nome: "Pessoa", avatar_url: null, papel: "membro", organizador: false,
  percentual: 0, status_leitura: "nao_iniciou", ultima_atividade: null, parado: false, rsvp: null,
  ...extra,
});

describe("rotuloUltimaAtividade", () => {
  const agora = new Date(2026, 10, 25, 15, 0, 0);

  it("trata quem nunca fez nada", () => {
    expect(rotuloUltimaAtividade(null, agora)).toBe("Sem atividade ainda");
    expect(rotuloUltimaAtividade("data inválida", agora)).toBe("Sem atividade ainda");
  });

  it("distingue hoje e ontem pelo dia do calendário, não por 24 horas", () => {
    expect(rotuloUltimaAtividade(new Date(2026, 10, 25, 0, 30).toISOString(), agora)).toBe("Ativo hoje");
    expect(rotuloUltimaAtividade(new Date(2026, 10, 24, 23, 50).toISOString(), agora)).toBe("Ativo ontem");
  });

  it("conta dias e depois meses", () => {
    expect(rotuloUltimaAtividade(new Date(2026, 10, 18, 10).toISOString(), agora)).toBe("Ativo há 7 dias");
    expect(rotuloUltimaAtividade(new Date(2026, 9, 20, 10).toISOString(), agora)).toBe("Ativo há 1 mês");
    expect(rotuloUltimaAtividade(new Date(2026, 7, 1, 10).toISOString(), agora)).toBe("Ativo há 3 meses");
  });

  it("não quebra com data no futuro", () => {
    expect(rotuloUltimaAtividade(new Date(2026, 10, 26, 10).toISOString(), agora)).toBe("Ativo hoje");
  });
});

describe("resumoLeitura", () => {
  it("conta por situação e ignora quem não tem livro definido", () => {
    const lista = [
      membro({ status_leitura: "lendo" }), membro({ status_leitura: "lendo" }),
      membro({ status_leitura: "concluido" }), membro({ status_leitura: "nao_iniciou" }),
      membro({ status_leitura: null, percentual: null }),
    ];
    expect(resumoLeitura(lista)).toEqual({ nao_iniciou: 1, lendo: 2, concluido: 1 });
  });
});

describe("textoResumoLeitura", () => {
  it("usa singular quando é uma pessoa só", () => {
    expect(textoResumoLeitura({ concluido: 1, lendo: 3, nao_iniciou: 1 })).toBe("1 concluiu · 3 lendo · 1 não começou");
  });

  it("usa plural para zero e para vários", () => {
    expect(textoResumoLeitura({ concluido: 0, lendo: 0, nao_iniciou: 4 })).toBe("0 concluíram · 0 lendo · 4 não começaram");
  });
});

describe("filtrarMembros", () => {
  const lista = [
    membro({ user_id: "a", parado: true }),
    membro({ user_id: "b", status_leitura: "lendo" }),
    membro({ user_id: "c", organizador: true }),
  ];

  it("devolve todos sem filtro", () => {
    expect(filtrarMembros(lista, "todos")).toHaveLength(3);
  });

  it("filtra os parados", () => {
    expect(filtrarMembros(lista, "parados").map((m) => m.user_id)).toEqual(["a"]);
  });

  it("em 'não começaram' deixa o organizador de fora", () => {
    expect(filtrarMembros(lista, "nao_iniciou").map((m) => m.user_id)).toEqual(["a"]);
  });
});

describe("resumoRespostas", () => {
  const encontro = { id: "e", titulo: "t", inicio_em: "", url_evento: null, confirmados: 0, talvez: 0, recusados: 0, sem_resposta: 0 };

  it("usa singular e plural certos e omite zeros", () => {
    expect(resumoRespostas({ ...encontro, confirmados: 1, sem_resposta: 4 })).toBe("1 confirmou, 4 sem resposta");
    expect(resumoRespostas({ ...encontro, confirmados: 3, talvez: 1, recusados: 2 })).toBe("3 confirmaram, 1 talvez, 2 não vão");
    expect(resumoRespostas({ ...encontro, recusados: 1 })).toBe("1 não vai");
  });

  it("avisa quando não há membros nem respostas", () => {
    expect(resumoRespostas(encontro)).toBe("Ninguém respondeu ainda");
  });
});
