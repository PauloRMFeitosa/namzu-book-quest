import { describe, expect, it } from "vitest";
import { mensagemDoAviso, quandoDoAviso, resumoDoAviso, textoDeAvisos, validarAviso } from "./avisos";

describe("validarAviso", () => {
  it("aceita título e mensagem dentro dos limites", () => {
    expect(validarAviso("Mudança de horário", "O encontro passa para as 20h.")).toBeNull();
    expect(validarAviso("x".repeat(120), "y".repeat(2000))).toBeNull();
  });

  it("aponta o primeiro problema", () => {
    expect(validarAviso("  ", "Mensagem")).toBe("Dê um título para o aviso.");
    expect(validarAviso("x".repeat(121), "Mensagem")).toMatch(/120 letras/);
    expect(validarAviso("Título", "   ")).toBe("Escreva a mensagem do aviso.");
    expect(validarAviso("Título", "y".repeat(2001))).toMatch(/2\.000 caracteres/);
  });
});

describe("quandoDoAviso", () => {
  const agora = new Date(2026, 10, 25, 15, 0, 0);

  it("usa o dia do calendário", () => {
    expect(quandoDoAviso(new Date(2026, 10, 25, 0, 10).toISOString(), agora)).toBe("hoje");
    expect(quandoDoAviso(new Date(2026, 10, 24, 23, 50).toISOString(), agora)).toBe("ontem");
    expect(quandoDoAviso(new Date(2026, 10, 22, 9, 0).toISOString(), agora)).toBe("há 3 dias");
    expect(quandoDoAviso(new Date(2026, 10, 18, 9, 0).toISOString(), agora)).toBe("há 7 dias");
  });

  it("depois de uma semana mostra a data", () => {
    expect(quandoDoAviso(new Date(2026, 10, 12, 9, 0).toISOString(), agora)).toBe("12/11");
  });

  it("data inválida vira vazio", () => {
    expect(quandoDoAviso("nada", agora)).toBe("");
  });
});

describe("resumoDoAviso", () => {
  it("mensagem curta fica inteira, em uma linha", () => {
    expect(resumoDoAviso("Linha um.\n\nLinha   dois.")).toBe("Linha um. Linha dois.");
  });

  it("mensagem longa é cortada em uma palavra, com reticências", () => {
    const resumo = resumoDoAviso("palavra ".repeat(40), 50);
    expect(resumo.endsWith("…")).toBe(true);
    expect(resumo.length).toBeLessThanOrEqual(51);
    expect(resumo).not.toMatch(/palav…$/);
  });

  it("texto sem espaços é cortado no limite", () => {
    expect(resumoDoAviso("x".repeat(200), 50)).toBe(`${"x".repeat(50)}…`);
  });
});

describe("mensagemDoAviso", () => {
  it("monta o texto para o grupo", () => {
    expect(
      mensagemDoAviso({
        nomeClube: "Leitoras do Cariri",
        titulo: " Mudança de horário ",
        mensagem: " O encontro passa para as 20h.\nLevem o livro. ",
        link: "https://www.namzu.com.br/clubes/x",
      }),
    ).toBe(
      [
        "📢 Leitoras do Cariri",
        "Mudança de horário",
        "",
        "O encontro passa para as 20h.\nLevem o livro.",
        "",
        "No app: https://www.namzu.com.br/clubes/x",
      ].join("\n"),
    );
  });
});

describe("textoDeAvisos", () => {
  it("usa singular e plural", () => {
    expect(textoDeAvisos(1)).toBe("1 aviso");
    expect(textoDeAvisos(4)).toBe("4 avisos");
  });
});
