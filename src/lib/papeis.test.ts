import { describe, expect, it } from "vitest";
import { papeisDisponiveis, permissoesNoClube, podeAlterarMembro, rotuloDoPapel } from "./papeis";

const base = { userId: "u1", curadorId: "dono", papel: "membro", status: "ativo", isAdmin: false };

describe("permissoesNoClube", () => {
  it("organizador gerencia e nomeia", () => {
    expect(permissoesNoClube({ ...base, userId: "dono" })).toEqual({
      ehDono: true, ehCoCurador: false, podeGerir: true, podeNomear: true,
    });
  });

  it("co-curador ativo gerencia, mas não nomeia", () => {
    expect(permissoesNoClube({ ...base, papel: "co_curador" })).toEqual({
      ehDono: false, ehCoCurador: true, podeGerir: true, podeNomear: false,
    });
  });

  it("co-curador que não está ativo perde tudo", () => {
    for (const status of ["pendente", "banido", "removido", null]) {
      expect(permissoesNoClube({ ...base, papel: "co_curador", status }).podeGerir).toBe(false);
    }
  });

  it("membro e moderador não gerenciam", () => {
    expect(permissoesNoClube(base).podeGerir).toBe(false);
    expect(permissoesNoClube({ ...base, papel: "moderador" }).podeGerir).toBe(false);
  });

  it("admin gerencia e nomeia mesmo sem ser do clube", () => {
    expect(permissoesNoClube({ ...base, papel: null, status: null, isAdmin: true })).toEqual({
      ehDono: false, ehCoCurador: false, podeGerir: true, podeNomear: true,
    });
  });

  it("sem usuário ou sem organizador, ninguém é dono", () => {
    expect(permissoesNoClube({ ...base, userId: null, curadorId: null }).ehDono).toBe(false);
    expect(permissoesNoClube({ ...base, userId: undefined, curadorId: undefined }).ehDono).toBe(false);
  });
});

describe("rotuloDoPapel", () => {
  it("dá nome a cada papel", () => {
    expect(rotuloDoPapel("moderador", true)).toBe("Organizador");
    expect(rotuloDoPapel("co_curador", false)).toBe("Co-curador");
    expect(rotuloDoPapel("moderador", false)).toBe("Moderador");
    expect(rotuloDoPapel("membro", false)).toBe("Membro");
    expect(rotuloDoPapel(null, false)).toBe("Membro");
  });
});

describe("podeAlterarMembro", () => {
  const dono = permissoesNoClube({ ...base, userId: "dono" });
  const co = permissoesNoClube({ ...base, papel: "co_curador" });
  const membro = permissoesNoClube(base);
  const alvo = (papel: string, extra = {}) => ({ ehDono: false, papel, souEu: false, ...extra });

  it("organizador altera todos, menos a si mesmo", () => {
    expect(podeAlterarMembro(dono, alvo("membro"))).toBe(true);
    expect(podeAlterarMembro(dono, alvo("co_curador"))).toBe(true);
    expect(podeAlterarMembro(dono, alvo("membro", { souEu: true, ehDono: true }))).toBe(false);
  });

  it("co-curador altera membros e moderadores, não o organizador nem outro co-curador", () => {
    expect(podeAlterarMembro(co, alvo("membro"))).toBe(true);
    expect(podeAlterarMembro(co, alvo("moderador"))).toBe(true);
    expect(podeAlterarMembro(co, alvo("co_curador"))).toBe(false);
    expect(podeAlterarMembro(co, alvo("membro", { ehDono: true }))).toBe(false);
    expect(podeAlterarMembro(co, alvo("co_curador", { souEu: true }))).toBe(false);
  });

  it("membro comum não altera ninguém", () => {
    expect(podeAlterarMembro(membro, alvo("membro"))).toBe(false);
  });
});

describe("papeisDisponiveis", () => {
  const dono = permissoesNoClube({ ...base, userId: "dono" });
  const co = permissoesNoClube({ ...base, papel: "co_curador" });

  it("organizador pode nomear co-curador enquanto há vaga", () => {
    expect(papeisDisponiveis(dono, { papelAtual: "membro", coCuradores: 2 })).toEqual(["membro", "moderador", "co_curador"]);
    expect(papeisDisponiveis(dono, { papelAtual: "membro", coCuradores: 3 })).toEqual(["membro", "moderador"]);
  });

  it("quem já é co-curador continua com a opção, mesmo com o clube cheio", () => {
    expect(papeisDisponiveis(dono, { papelAtual: "co_curador", coCuradores: 3 })).toContain("co_curador");
  });

  it("co-curador não oferece o papel de co-curador", () => {
    expect(papeisDisponiveis(co, { papelAtual: "membro", coCuradores: 0 })).toEqual(["membro", "moderador"]);
  });
});
