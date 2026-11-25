import { describe, expect, it } from "vitest";
import {
  diaComSemana,
  diaCurto,
  diasEntre,
  dividirEmSemanas,
  escreverDia,
  lerAlvo,
  lerDia,
  livroDoCiclo,
  mensagemDaMeta,
  metaAtual,
  paginaDoAlvo,
  periodoDoLivro,
  prazoDaMeta,
  situacaoNaMeta,
  somarDias,
  textoDoAlvo,
  validarCronograma,
} from "./cronograma";

describe("dias sem hora", () => {
  it("lê e escreve o mesmo dia, sem escorregar com o fuso", () => {
    const data = lerDia("2026-11-30");
    expect(data?.getDate()).toBe(30);
    expect(data?.getMonth()).toBe(10);
    expect(escreverDia(data!)).toBe("2026-11-30");
  });

  it("recusa texto que não é um dia", () => {
    expect(lerDia("")).toBeNull();
    expect(lerDia(null)).toBeNull();
    expect(lerDia("30/11/2026")).toBeNull();
    expect(lerDia("2026-02-30")).toBeNull();
    expect(lerDia("2026-11-30T10:00:00Z")).toBeNull();
  });

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-11-28", 6)).toBe("2026-12-04");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("conta dias entre duas datas", () => {
    expect(diasEntre("2026-11-25", "2026-11-25")).toBe(0);
    expect(diasEntre("2026-11-25", "2026-12-02")).toBe(7);
    expect(diasEntre("2026-11-25", "2026-11-20")).toBe(-5);
  });

  it("formata para leitura", () => {
    expect(diaCurto("2026-11-05")).toBe("05/11");
    expect(diaComSemana("2026-11-29")).toBe("dom., 29/11");
    expect(diaCurto(null)).toBe("");
    expect(periodoDoLivro("2026-11-10", "2026-11-30")).toBe("10/11 a 30/11");
    expect(periodoDoLivro("2026-11-10", null)).toBe("A partir de 10/11");
    expect(periodoDoLivro(null, "2026-11-30")).toBe("Até 30/11");
    expect(periodoDoLivro(null, null)).toBe("");
  });
});

describe("prazoDaMeta", () => {
  const hoje = "2026-11-25";
  it("diz quanto falta ou há quanto terminou", () => {
    expect(prazoDaMeta("2026-11-25", hoje)).toBe("termina hoje");
    expect(prazoDaMeta("2026-11-26", hoje)).toBe("termina amanhã");
    expect(prazoDaMeta("2026-11-30", hoje)).toBe("faltam 5 dias");
    expect(prazoDaMeta("2026-11-24", hoje)).toBe("terminou ontem");
    expect(prazoDaMeta("2026-11-20", hoje)).toBe("terminou há 5 dias");
  });
});

describe("dividirEmSemanas", () => {
  it("divide quatro semanas exatas", () => {
    const metas = dividirEmSemanas("2026-11-02", "2026-11-29");
    expect(metas.map((m) => m.titulo)).toEqual(["Semana 1", "Semana 2", "Semana 3", "Semana 4"]);
    expect(metas.map((m) => m.data_limite)).toEqual(["2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
    expect(metas.map((m) => m.percentual_alvo)).toEqual([25, 50, 75, 100]);
  });

  it("a última semana termina no fim do livro e vale 100%", () => {
    const metas = dividirEmSemanas("2026-11-02", "2026-11-25");
    expect(metas).toHaveLength(4);
    expect(metas[3].data_limite).toBe("2026-11-25");
    expect(metas[3].percentual_alvo).toBe(100);
    expect(metas[0].percentual_alvo).toBe(29);
  });

  it("período menor que uma semana vira uma meta só", () => {
    expect(dividirEmSemanas("2026-11-02", "2026-11-04")).toEqual([
      { titulo: "Semana 1", data_limite: "2026-11-04", percentual_alvo: 100 },
    ]);
    expect(dividirEmSemanas("2026-11-02", "2026-11-02")).toHaveLength(1);
  });

  it("não divide período inválido, invertido ou longo demais", () => {
    expect(dividirEmSemanas("", "2026-11-04")).toEqual([]);
    expect(dividirEmSemanas("2026-11-10", "2026-11-04")).toEqual([]);
    expect(dividirEmSemanas("2026-01-01", "2028-01-01")).toEqual([]);
  });

  it("os alvos sempre crescem e ficam entre 1 e 100", () => {
    const metas = dividirEmSemanas("2026-01-01", "2026-12-31");
    expect(metas).toHaveLength(53);
    for (let i = 0; i < metas.length; i++) {
      expect(metas[i].percentual_alvo).toBeGreaterThanOrEqual(1);
      expect(metas[i].percentual_alvo).toBeLessThanOrEqual(100);
      if (i > 0) expect(metas[i].percentual_alvo!).toBeGreaterThanOrEqual(metas[i - 1].percentual_alvo!);
    }
  });
});

describe("metaAtual", () => {
  const metas = [
    { titulo: "Semana 3", data_limite: "2026-11-29" },
    { titulo: "Semana 1", data_limite: "2026-11-15" },
    { titulo: "Semana 2", data_limite: "2026-11-22" },
  ];

  it("é a primeira que ainda não venceu, mesmo fora de ordem", () => {
    expect(metaAtual(metas, "2026-11-16")?.titulo).toBe("Semana 2");
  });

  it("a meta que vence hoje ainda é a atual", () => {
    expect(metaAtual(metas, "2026-11-22")?.titulo).toBe("Semana 2");
  });

  it("é nula quando todas venceram ou não há metas", () => {
    expect(metaAtual(metas, "2026-12-01")).toBeNull();
    expect(metaAtual([], "2026-11-16")).toBeNull();
  });
});

describe("situacaoNaMeta", () => {
  it("compara o progresso com o alvo", () => {
    expect(situacaoNaMeta(50, false, { percentual_alvo: 50 })).toBe("alcancou");
    expect(situacaoNaMeta(49, false, { percentual_alvo: 50 })).toBe("abaixo");
    expect(situacaoNaMeta(null, false, { percentual_alvo: 50 })).toBe("abaixo");
  });

  it("quem concluiu o livro alcançou qualquer meta", () => {
    expect(situacaoNaMeta(0, true, { percentual_alvo: 100 })).toBe("alcancou");
    expect(situacaoNaMeta(0, true, { percentual_alvo: null })).toBe("alcancou");
  });

  it("meta sem alvo não dá para comparar", () => {
    expect(situacaoNaMeta(80, false, { percentual_alvo: null })).toBe("sem_alvo");
  });
});

describe("alvo em páginas", () => {
  it("converte o alvo em página quando se sabe o total", () => {
    expect(paginaDoAlvo(50, 264)).toBe(132);
    expect(paginaDoAlvo(1, 40)).toBe(1);
    expect(paginaDoAlvo(100, 264)).toBe(264);
    expect(paginaDoAlvo(50, null)).toBeNull();
    expect(paginaDoAlvo(null, 264)).toBeNull();
  });

  it("escreve o alvo para leitura", () => {
    expect(textoDoAlvo(50, 264)).toBe("até 50% do livro, perto da página 132");
    expect(textoDoAlvo(50, null)).toBe("até 50% do livro");
    expect(textoDoAlvo(100, 264)).toBe("até o fim do livro");
    expect(textoDoAlvo(null, 264)).toBe("");
  });

  it("lê o campo de alvo", () => {
    expect(lerAlvo("")).toBeNull();
    expect(lerAlvo("  ")).toBeNull();
    expect(lerAlvo("50")).toBe(50);
    expect(lerAlvo("33,4")).toBe(33);
    expect(lerAlvo("abc")).toBeNull();
  });
});

describe("validarCronograma", () => {
  const meta = { titulo: "Semana 1", percentual_alvo: 25, data_limite: "2026-11-08" };

  it("aceita cronograma certo, com ou sem datas do livro e sem metas", () => {
    expect(validarCronograma("2026-11-02", "2026-11-29", [meta])).toBeNull();
    expect(validarCronograma("", "", [])).toBeNull();
    expect(validarCronograma("", "", [{ ...meta, percentual_alvo: null }])).toBeNull();
  });

  it("aponta o primeiro problema", () => {
    expect(validarCronograma("2026-11-29", "2026-11-02", [meta])).toMatch(/antes do início/);
    expect(validarCronograma("", "", [{ ...meta, titulo: "  " }])).toBe("Dê um nome para a meta 1.");
    expect(validarCronograma("", "", [meta, { ...meta, data_limite: "" }])).toBe("Informe a data da meta 2.");
    expect(validarCronograma("", "", [{ ...meta, percentual_alvo: 0 }])).toMatch(/entre 1 e 100/);
    expect(validarCronograma("", "", [{ ...meta, percentual_alvo: 101 }])).toMatch(/entre 1 e 100/);
    expect(validarCronograma("", "", [{ ...meta, titulo: "x".repeat(81) }])).toMatch(/80 letras/);
    expect(validarCronograma("", "", Array.from({ length: 61 }, () => meta))).toMatch(/até 60 metas/);
  });
});

describe("livroDoCiclo", () => {
  const hoje = "2026-11-25";
  const livro = (ordem: number, inicio: string | null, fim: string | null) => ({
    ordem,
    data_inicio_sugerida: inicio,
    data_fim_sugerida: fim,
  });

  it("prefere o livro cujo período inclui hoje", () => {
    const trilha = [livro(1, "2026-10-01", "2026-10-31"), livro(2, "2026-11-10", "2026-12-10"), livro(3, null, null)];
    expect(livroDoCiclo(trilha, hoje)?.ordem).toBe(2);
  });

  it("sem livro no período, pega o próximo que ainda não terminou", () => {
    const trilha = [livro(1, "2026-10-01", "2026-10-31"), livro(2, "2026-12-01", "2026-12-31")];
    expect(livroDoCiclo(trilha, hoje)?.ordem).toBe(2);
  });

  it("sem datas, vale a ordem da trilha", () => {
    expect(livroDoCiclo([livro(2, null, null), livro(1, null, null)], hoje)?.ordem).toBe(1);
  });

  it("trilha vazia não tem livro do ciclo", () => {
    expect(livroDoCiclo([], hoje)).toBeNull();
  });
});

describe("mensagemDaMeta", () => {
  it("monta o texto para o grupo com página quando há total", () => {
    const texto = mensagemDaMeta({
      nomeClube: "Leitoras do Cariri",
      livro: "Torto Arado",
      meta: { titulo: "Semana 2", percentual_alvo: 50, data_limite: "2026-11-29" },
      totalPaginas: 264,
      link: "https://www.namzu.com.br/clubes/abc?tab=leituras",
    });
    expect(texto).toBe(
      [
        "📖 Leitoras do Cariri",
        "Meta de leitura: Semana 2 (até 50% do livro, perto da página 132)",
        "Livro: Torto Arado",
        "Prazo: dom., 29/11",
        "",
        "Registre seu progresso: https://www.namzu.com.br/clubes/abc?tab=leituras",
      ].join("\n"),
    );
  });

  it("sem alvo, não inventa página", () => {
    const texto = mensagemDaMeta({
      nomeClube: "Clube",
      livro: "Livro",
      meta: { titulo: "Capítulos 1 a 3", percentual_alvo: null, data_limite: "2026-11-29" },
      link: "https://x",
    });
    expect(texto).toContain("Meta de leitura: Capítulos 1 a 3\n");
  });
});
