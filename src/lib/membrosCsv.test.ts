import { describe, it, expect } from "vitest";
import { celulaCsv, dataCsv, gerarCsvMembros, nomeArquivoCsv, type LinhaMembroCsv } from "@/lib/membrosCsv";

const linha = (extra: Partial<LinhaMembroCsv>): LinhaMembroCsv => ({
  nome: "Bia", usuario: "bia", papel: "Membro", entrouEm: "2026-10-01T12:00:00Z", percentual: 40,
  situacaoLeitura: "Lendo", ultimaAtividade: "2026-11-24T12:00:00Z", parado: false, respostaEncontro: "Confirmou",
  ...extra,
});

describe("celulaCsv", () => {
  it("deixa texto simples e números como estão", () => {
    expect(celulaCsv("Ana Maria")).toBe("Ana Maria");
    expect(celulaCsv(40)).toBe("40");
    expect(celulaCsv(0)).toBe("0");
  });

  it("devolve vazio para nulo e indefinido", () => {
    expect(celulaCsv(null)).toBe("");
    expect(celulaCsv(undefined)).toBe("");
  });

  it("põe aspas quando há ponto e vírgula, aspas ou quebra de linha", () => {
    expect(celulaCsv("Silva; Ana")).toBe('"Silva; Ana"');
    expect(celulaCsv('Ana "Nana" Lima')).toBe('"Ana ""Nana"" Lima"');
    expect(celulaCsv("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });

  it("neutraliza textos que o Excel executaria como fórmula", () => {
    expect(celulaCsv("=1+1")).toBe("'=1+1");
    expect(celulaCsv("+55 85 9999")).toBe("'+55 85 9999");
    expect(celulaCsv("-Ana")).toBe("'-Ana");
    expect(celulaCsv("@ana")).toBe("'@ana");
    expect(celulaCsv('=HYPERLINK("http://x";"clique")')).toBe(`"'=HYPERLINK(""http://x"";""clique"")"`);
  });
});

describe("dataCsv", () => {
  it("formata no padrão brasileiro", () => {
    expect(dataCsv(new Date(2026, 10, 5, 12).toISOString())).toBe("05/11/2026");
  });

  it("devolve vazio para data ausente ou inválida", () => {
    expect(dataCsv(null)).toBe("");
    expect(dataCsv("nada")).toBe("");
  });
});

describe("gerarCsvMembros", () => {
  it("começa com BOM e cabeçalho, uma linha por membro, separado por ponto e vírgula", () => {
    const csv = gerarCsvMembros([linha({}), linha({ nome: "Caio", usuario: null, percentual: null, parado: null, respostaEncontro: null })]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const linhas = csv.slice(1).trimEnd().split("\r\n");
    expect(linhas).toHaveLength(3);
    expect(linhas[0].split(";")).toHaveLength(9);
    expect(linhas[0]).toContain("Progresso no livro atual (%)");
    expect(linhas[1].split(";")[0]).toBe("Bia");
    expect(linhas[1].split(";")[1]).toBe("bia");
    expect(linhas[1].split(";")[4]).toBe("40");
    expect(linhas[1].split(";")[7]).toBe("Não");
    expect(linhas[2].split(";")).toEqual(["Caio", "", "Membro", expect.any(String), "", "Lendo", expect.any(String), "", ""]);
  });

  it("marca parado como Sim", () => {
    const csv = gerarCsvMembros([linha({ parado: true })]);
    expect(csv.split("\r\n")[1].split(";")[7]).toBe("Sim");
  });

  it("gera só o cabeçalho quando não há membros", () => {
    expect(gerarCsvMembros([]).slice(1).trimEnd().split("\r\n")).toHaveLength(1);
  });
});

describe("nomeArquivoCsv", () => {
  const quando = new Date(2026, 10, 25);

  it("tira acentos e símbolos do nome do clube", () => {
    expect(nomeArquivoCsv("Leitoras do Cariri — 2ª edição!", quando)).toBe("membros-leitoras-do-cariri-2-edicao-2026-11-25.csv");
  });

  it("usa um nome padrão quando o clube não tem nome aproveitável", () => {
    expect(nomeArquivoCsv("", quando)).toBe("membros-clube-2026-11-25.csv");
    expect(nomeArquivoCsv("!!!", quando)).toBe("membros-clube-2026-11-25.csv");
  });
});
