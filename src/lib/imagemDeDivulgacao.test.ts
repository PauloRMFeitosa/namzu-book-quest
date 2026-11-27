import { describe, expect, it } from "vitest";
import { FORMATOS, cortarParaAImagem, dataDoEncontroNaImagem, livrosParaAImagem, nomeDoArquivo } from "./imagemDeDivulgacao";

describe("dataDoEncontroNaImagem", () => {
  it("separa dia, mês, dia da semana e hora no fuso de Brasília", () => {
    expect(dataDoEncontroNaImagem("2026-12-11T22:30:00Z")).toEqual({ dia: "11", mes: "DEZ", semana: "sexta-feira", hora: "19h30" });
    expect(dataDoEncontroNaImagem("2026-12-05T01:00:00Z")).toMatchObject({ dia: "04", semana: "sexta-feira", hora: "22h" });
  });
});

describe("nomeDoArquivo", () => {
  it("usa o nome do clube sem acento nem espaço", () => {
    expect(nomeDoArquivo("encontro", "Leitoras do Cariri")).toBe("encontro-leitoras-do-cariri.png");
    expect(nomeDoArquivo("trilha", "!!!")).toBe("trilha-clube.png");
  });
});

describe("cortarParaAImagem", () => {
  it("mantém texto curto e corta o longo em palavra inteira", () => {
    expect(cortarParaAImagem("Encontro de dezembro", 60)).toBe("Encontro de dezembro");
    const cortado = cortarParaAImagem("Um Defeito de Cor: a saga de Kehinde do Daomé ao Brasil e de volta", 40);
    expect(cortado.length).toBeLessThanOrEqual(40);
    expect(cortado.endsWith("…")).toBe(true);
    expect(cortado).not.toMatch(/ …$/);
  });
});

describe("livrosParaAImagem", () => {
  const trilha = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));

  it("pega o atual e os três seguintes", () => {
    expect(livrosParaAImagem(trilha, "b")).toEqual({ atual: { id: "b" }, proximos: [{ id: "c" }, { id: "d" }, { id: "e" }] });
  });

  it("sem atual definido, começa do primeiro", () => {
    expect(livrosParaAImagem(trilha, null).atual).toEqual({ id: "a" });
    expect(livrosParaAImagem([], "x")).toEqual({ atual: null, proximos: [] });
    expect(livrosParaAImagem(trilha, "f")).toEqual({ atual: { id: "f" }, proximos: [] });
  });
});

describe("formatos", () => {
  it("tem os tamanhos de feed e de stories", () => {
    expect(FORMATOS.feed).toMatchObject({ largura: 1080, altura: 1350 });
    expect(FORMATOS.stories).toMatchObject({ largura: 1080, altura: 1920 });
  });
});
