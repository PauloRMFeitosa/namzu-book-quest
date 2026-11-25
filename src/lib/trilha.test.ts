import { describe, expect, it } from "vitest";
import { filtrarAcervo, metasSemanaisDaObra, resumoDasMetas, validarNovaObra } from "./trilha";

const base = { obraId: "o1", inicio: "", fim: "", criarMetasSemanais: false };

describe("validarNovaObra", () => {
  it("aceita só o livro, sem datas", () => {
    expect(validarNovaObra(base, [])).toBeNull();
  });

  it("aceita livro com período e metas semanais", () => {
    expect(validarNovaObra({ ...base, inicio: "2026-12-01", fim: "2026-12-28", criarMetasSemanais: true }, ["o2"])).toBeNull();
  });

  it("aponta o primeiro problema", () => {
    expect(validarNovaObra({ ...base, obraId: null }, [])).toMatch(/Escolha o livro/);
    expect(validarNovaObra(base, ["o1"])).toMatch(/já está na trilha/);
    expect(validarNovaObra({ ...base, inicio: "2026-12-10", fim: "2026-12-01" }, [])).toMatch(/antes do início/);
    expect(validarNovaObra({ ...base, inicio: "2026-12-01", criarMetasSemanais: true }, [])).toMatch(/informe o início e o fim/);
    expect(validarNovaObra({ ...base, inicio: "2026-01-01", fim: "2028-06-01", criarMetasSemanais: true }, [])).toMatch(/longo demais/);
    expect(validarNovaObra({ ...base, inicio: "01/12/2026" }, [])).toMatch(/início não é válida/);
  });
});

describe("metasSemanaisDaObra", () => {
  it("divide o período quando a opção está ligada", () => {
    const metas = metasSemanaisDaObra({ inicio: "2026-12-01", fim: "2026-12-28", criarMetasSemanais: true });
    expect(metas).toHaveLength(4);
    expect(metas[3]).toEqual({ titulo: "Semana 4", data_limite: "2026-12-28", percentual_alvo: 100 });
  });

  it("não cria nada com a opção desligada ou sem datas", () => {
    expect(metasSemanaisDaObra({ inicio: "2026-12-01", fim: "2026-12-28", criarMetasSemanais: false })).toEqual([]);
    expect(metasSemanaisDaObra({ inicio: "", fim: "2026-12-28", criarMetasSemanais: true })).toEqual([]);
  });
});

describe("resumoDasMetas", () => {
  it("usa singular e plural", () => {
    expect(resumoDasMetas(0)).toBe("");
    expect(resumoDasMetas(1)).toBe("1 meta para o período");
    expect(resumoDasMetas(4)).toBe("4 metas, uma por semana");
  });
});

describe("filtrarAcervo", () => {
  const acervo = [
    { titulo: "Tudo é Rio", titulo_ordenacao: "tudo e rio", autor: "Carla Madeira" },
    { titulo: "Água Viva", titulo_ordenacao: "agua viva", autor: "Clarice Lispector" },
    { titulo: "Sem Autoria", titulo_ordenacao: "sem autoria", autor: null },
  ];

  it("sem busca, devolve tudo em ordem de título", () => {
    expect(filtrarAcervo(acervo, "  ").map((l) => l.titulo)).toEqual(["Água Viva", "Sem Autoria", "Tudo é Rio"]);
  });

  it("acha por título ou autoria, sem ligar para acento e maiúscula", () => {
    expect(filtrarAcervo(acervo, "agua").map((l) => l.titulo)).toEqual(["Água Viva"]);
    expect(filtrarAcervo(acervo, "É RIO").map((l) => l.titulo)).toEqual(["Tudo é Rio"]);
    expect(filtrarAcervo(acervo, "clarice").map((l) => l.titulo)).toEqual(["Água Viva"]);
    expect(filtrarAcervo(acervo, "xyz")).toEqual([]);
  });
});
