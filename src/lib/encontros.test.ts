import { describe, expect, it } from "vitest";
import {
  encontroJaComecou,
  mensagemDoEncontro,
  mesmaLista,
  ordenarParaPresenca,
  presencaInicial,
  quandoDoEncontro,
  resumoDaPresenca,
  rotuloDaResposta,
  validarAta,
  type PessoaDaPresenca,
} from "./encontros";

const agora = new Date(2026, 10, 25, 15, 0, 0); // quarta, 25/11/2026, 15h

describe("quandoDoEncontro", () => {
  it("usa hoje e amanhã pelo dia do calendário", () => {
    expect(quandoDoEncontro(new Date(2026, 10, 25, 19, 30), agora)).toBe("hoje, às 19:30");
    expect(quandoDoEncontro(new Date(2026, 10, 26, 0, 5), agora)).toBe("amanhã, às 00:05");
  });

  it("mostra dia da semana e data para os outros dias", () => {
    expect(quandoDoEncontro(new Date(2026, 10, 28, 9, 0), agora)).toBe("sáb., 28/11, às 09:00");
    expect(quandoDoEncontro(new Date(2026, 10, 24, 20, 0), agora)).toBe("ter., 24/11, às 20:00");
  });

  it("aceita texto de data e devolve vazio para data inválida", () => {
    expect(quandoDoEncontro(new Date(2026, 10, 25, 19, 30).toISOString(), agora)).toBe("hoje, às 19:30");
    expect(quandoDoEncontro("nada", agora)).toBe("");
  });
});

describe("encontroJaComecou", () => {
  it("compara com o momento atual", () => {
    expect(encontroJaComecou(new Date(2026, 10, 25, 14, 59), agora)).toBe(true);
    expect(encontroJaComecou(new Date(2026, 10, 25, 15, 0), agora)).toBe(true);
    expect(encontroJaComecou(new Date(2026, 10, 25, 15, 1), agora)).toBe(false);
  });
});

describe("mensagemDoEncontro", () => {
  it("monta o texto para o grupo com o link da chamada", () => {
    const texto = mensagemDoEncontro({
      nomeClube: "Leitoras do Cariri",
      titulo: "Conversa sobre Torto Arado",
      inicio: new Date(2026, 10, 26, 19, 30),
      urlEvento: " https://meet.example/abc ",
      link: "https://www.namzu.com.br/clubes/x?tab=eventos",
      agora,
    });
    expect(texto).toBe(
      [
        "📅 Leitoras do Cariri",
        "Encontro: Conversa sobre Torto Arado",
        "Quando: Amanhã, às 19:30",
        "Link do encontro: https://meet.example/abc",
        "",
        "Confirme sua presença: https://www.namzu.com.br/clubes/x?tab=eventos",
      ].join("\n"),
    );
  });

  it("sem link de chamada, a linha não aparece", () => {
    const texto = mensagemDoEncontro({
      nomeClube: "Clube",
      titulo: "Encontro",
      inicio: new Date(2026, 10, 28, 9, 0),
      urlEvento: "  ",
      link: "https://x",
      agora,
    });
    expect(texto).not.toContain("Link do encontro");
    expect(texto).toContain("Quando: Sáb., 28/11, às 09:00");
  });
});

describe("lista de presença", () => {
  const pessoas: PessoaDaPresenca[] = [
    { user_id: "d", nome: "Davi", resposta: "recusado" },
    { user_id: "c", nome: "Caio", resposta: null },
    { user_id: "b", nome: "Bia", resposta: "confirmado" },
    { user_id: "e", nome: "Érica", resposta: "talvez" },
    { user_id: "a", nome: "Ana", resposta: "confirmado" },
  ];

  it("ordena por resposta e depois por nome", () => {
    expect(ordenarParaPresenca(pessoas).map((p) => p.nome)).toEqual(["Ana", "Bia", "Érica", "Caio", "Davi"]);
  });

  it("sem presença gravada, parte de quem confirmou", () => {
    expect(presencaInicial(pessoas, [], false).sort()).toEqual(["a", "b"]);
  });

  it("com presença gravada, vale o que está gravado, mesmo vazio", () => {
    expect(presencaInicial(pessoas, ["c", "d"], true)).toEqual(["c", "d"]);
    expect(presencaInicial(pessoas, [], true)).toEqual([]);
  });

  it("ignora quem saiu do clube depois de marcado", () => {
    expect(presencaInicial(pessoas, ["c", "saiu"], true)).toEqual(["c"]);
  });

  it("resume a presença com singular e plural", () => {
    expect(resumoDaPresenca(5, 8)).toBe("5 de 8 presentes");
    expect(resumoDaPresenca(1, 8)).toBe("1 de 8 presente");
    expect(resumoDaPresenca(0, 8)).toBe("Ninguém marcado");
  });

  it("compara listas sem depender da ordem", () => {
    expect(mesmaLista(["a", "b"], ["b", "a"])).toBe(true);
    expect(mesmaLista(["a", "b"], ["a"])).toBe(false);
    expect(mesmaLista(["a", "b"], ["a", "c"])).toBe(false);
    expect(mesmaLista([], [])).toBe(true);
  });

  it("dá nome a cada resposta", () => {
    expect(rotuloDaResposta("confirmado")).toBe("Confirmou");
    expect(rotuloDaResposta("talvez")).toBe("Talvez");
    expect(rotuloDaResposta("recusado")).toBe("Disse que não vai");
    expect(rotuloDaResposta(null)).toBe("Sem resposta");
  });
});

describe("validarAta", () => {
  it("aceita texto normal e ata vazia", () => {
    expect(validarAta("Falamos do capítulo 3.")).toBeNull();
    expect(validarAta("   ")).toBeNull();
  });

  it("recusa texto acima do limite", () => {
    expect(validarAta("x".repeat(20001))).toMatch(/20\.000/);
    expect(validarAta("x".repeat(20000))).toBeNull();
  });
});
