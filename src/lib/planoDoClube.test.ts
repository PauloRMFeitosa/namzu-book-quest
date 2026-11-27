import { describe, expect, it } from "vitest";
import {
  avisoDeVagas,
  bloqueioParaCriarClube,
  textoDaValidade,
  usoDoLimite,
  type PlanoDoClube,
} from "./planoDoClube";

const clube = (membros: number, limite: number | null): PlanoDoClube => ({
  plano: { chave: "basico", nome: "Básico", limite_membros: limite, limite_clubes: 1 },
  valido_ate: null,
  uso: { membros, co_curadores: 0, clubes: 1 },
});

describe("usoDoLimite", () => {
  it("sem limite", () => {
    expect(usoDoLimite(7, null)).toMatchObject({ situacao: "livre", texto: "7, sem limite", percentual: null });
    expect(usoDoLimite(7, undefined).limite).toBeNull();
  });

  it("classifica folga, perto, cheio e acima", () => {
    expect(usoDoLimite(7, 30)).toMatchObject({ situacao: "livre", texto: "7 de 30", percentual: 23 });
    expect(usoDoLimite(24, 30).situacao).toBe("perto");
    expect(usoDoLimite(30, 30)).toMatchObject({ situacao: "cheio", percentual: 100 });
    expect(usoDoLimite(45, 30)).toMatchObject({ situacao: "acima", percentual: 100 });
  });

  it("limite zero já nasce cheio", () => {
    expect(usoDoLimite(0, 0)).toMatchObject({ situacao: "cheio", percentual: 100 });
  });
});

describe("avisoDeVagas", () => {
  it("não avisa com folga, sem limite ou sem plano", () => {
    expect(avisoDeVagas(clube(7, 30))).toBeNull();
    expect(avisoDeVagas(clube(700, null))).toBeNull();
    expect(avisoDeVagas(null)).toBeNull();
    expect(avisoDeVagas({ plano: null, valido_ate: null, uso: { membros: 9, co_curadores: 0, clubes: 1 } })).toBeNull();
  });

  it("avisa quando está perto", () => {
    expect(avisoDeVagas(clube(28, 30))).toEqual({ cheio: false, texto: "O clube está com 28 de 30 membros. Restam 2 vagas no plano Básico." });
    expect(avisoDeVagas(clube(29, 30))?.texto).toMatch(/Resta 1 vaga/);
  });

  it("avisa quando lotou", () => {
    const aviso = avisoDeVagas(clube(30, 30));
    expect(aviso?.cheio).toBe(true);
    expect(aviso?.texto).toMatch(/30 de 30 membros.*bloqueadas/);
    expect(avisoDeVagas(clube(45, 30))?.cheio).toBe(true);
  });
});

describe("bloqueioParaCriarClube", () => {
  const plano = { chave: "basico", nome: "Básico", limite_membros: 30, limite_clubes: 1 };

  it("libera sem plano, sem limite ou com folga", () => {
    expect(bloqueioParaCriarClube(undefined)).toBeNull();
    expect(bloqueioParaCriarClube({ plano: null, clubes: 5 })).toBeNull();
    expect(bloqueioParaCriarClube({ plano: { ...plano, limite_clubes: null }, clubes: 5 })).toBeNull();
    expect(bloqueioParaCriarClube({ plano, clubes: 0 })).toBeNull();
  });

  it("explica o bloqueio", () => {
    expect(bloqueioParaCriarClube({ plano, clubes: 1 })).toBe("O plano Básico permite organizar até 1 clube, e você já organiza 1 clube.");
    expect(bloqueioParaCriarClube({ plano: { ...plano, limite_clubes: 3 }, clubes: 4 })).toMatch(/até 3 clubes, e você já organiza 4 clubes/);
  });
});

describe("textoDaValidade", () => {
  it("escreve a data ou nada", () => {
    expect(textoDaValidade("2026-12-31")).toBe("até 31/12/2026");
    expect(textoDaValidade(null)).toBeNull();
  });
});
