import { describe, expect, it } from "vitest";
import {
  agruparErros,
  ambienteDoApp,
  assinaturaDoErro,
  criarLimitador,
  descreverErro,
  ehRuido,
  limparRota,
  normalizarMensagem,
  type ErroRegistrado,
} from "./monitoramento";

describe("descreverErro", () => {
  it("lê Error, texto e objeto do Supabase", () => {
    const erro = descreverErro(new TypeError("x is not a function"));
    expect(erro.mensagem).toBe("TypeError: x is not a function");
    expect(erro.pilha).toContain("TypeError");
    expect(descreverErro(new Error("falhou")).mensagem).toBe("falhou");
    expect(descreverErro("deu ruim")).toEqual({ mensagem: "deu ruim", pilha: null });
    expect(descreverErro({ message: "permission denied for table x", code: "42501" }).mensagem).toBe(
      "permission denied for table x [42501]",
    );
  });

  it("não quebra com valor estranho e corta texto longo", () => {
    expect(descreverErro(undefined).mensagem).toBe("erro sem mensagem");
    expect(descreverErro(null).mensagem).toBe("erro sem mensagem");
    expect(descreverErro({}).mensagem).toBe("erro sem mensagem");
    expect(descreverErro("x".repeat(900)).mensagem).toHaveLength(500);
  });
});

describe("ehRuido", () => {
  it("descarta rede, versão trocada, extensão e avisos do navegador", () => {
    for (const mensagem of [
      "ResizeObserver loop completed with undelivered notifications.",
      "Script error.",
      "TypeError: Failed to fetch",
      "Failed to fetch dynamically imported module: https://x/assets/a.js",
      "AbortError: The user aborted a request.",
      "JWT expired [PGRST301]",
    ]) {
      expect(ehRuido({ mensagem, pilha: null })).toBe(true);
    }
    expect(ehRuido({ mensagem: "x is undefined", pilha: "at chrome-extension://abc/content.js:1:1" })).toBe(true);
  });

  it("mantém erro de verdade", () => {
    expect(ehRuido({ mensagem: "TypeError: Cannot read properties of undefined (reading 'map')", pilha: "at Lista (https://namzu.com.br/assets/a.js:1:1)" })).toBe(false);
    expect(ehRuido({ mensagem: "permission denied for table clubes [42501]", pilha: null })).toBe(false);
  });
});

describe("assinatura e rota", () => {
  it("erros iguais com ids diferentes têm a mesma assinatura", () => {
    const a = assinaturaDoErro("consulta", "linha 3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b não encontrada em 120 ms");
    const b = assinaturaDoErro("consulta", "linha 11111111-1111-4111-8111-111111111111 não encontrada em 98 ms");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-z0-9]{4,16}$/);
  });

  it("origem ou mensagem diferente muda a assinatura", () => {
    expect(assinaturaDoErro("erro", "falhou")).not.toBe(assinaturaDoErro("react", "falhou"));
    expect(assinaturaDoErro("erro", "falhou")).not.toBe(assinaturaDoErro("erro", "quebrou"));
    expect(normalizarMensagem("  item 42 de 100 ")).toBe("item 0 de 0");
  });

  it("limpa a rota e identifica o ambiente", () => {
    expect(limparRota("/clubes/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/eventos/novo?tab=x#y")).toBe("/clubes/:id/eventos/novo");
    expect(limparRota("/obras/123")).toBe("/obras/:id");
    expect(limparRota("/")).toBe("/");
    expect(ambienteDoApp("namzu.com.br")).toBe("producao");
    expect(ambienteDoApp("www.namzu.com.br")).toBe("producao");
    expect(ambienteDoApp("namzu-git-x.vercel.app")).toBe("preview");
  });
});

describe("criarLimitador", () => {
  it("envia cada assinatura uma vez, até o máximo", () => {
    const pode = criarLimitador(2);
    expect(pode("a")).toBe(true);
    expect(pode("a")).toBe(false);
    expect(pode("b")).toBe(true);
    expect(pode("c")).toBe(false);
  });
});

describe("agruparErros", () => {
  const erro = (id: number, assinatura: string, criado_em: string, extra: Partial<ErroRegistrado> = {}): ErroRegistrado => ({
    id,
    criado_em,
    user_id: "u1",
    origem: "erro",
    assinatura,
    mensagem: `mensagem ${assinatura}`,
    pilha: null,
    rota: "/",
    versao: "0.3.0",
    ambiente: "producao",
    navegador: null,
    ...extra,
  });

  it("junta por assinatura e ordena pelo mais recente", () => {
    const grupos = agruparErros([
      erro(1, "aaaa", "2026-11-20T10:00:00Z"),
      erro(2, "bbbb", "2026-11-22T10:00:00Z"),
      erro(3, "aaaa", "2026-11-25T10:00:00Z", { user_id: "u2", rota: "/clubes/:id", pilha: "pilha nova" }),
      erro(4, "aaaa", "2026-11-21T10:00:00Z", { user_id: null }),
    ]);
    expect(grupos.map((g) => g.assinatura)).toEqual(["aaaa", "bbbb"]);
    expect(grupos[0].ocorrencias).toBe(3);
    expect(grupos[0].pessoas).toBe(2);
    expect(grupos[0].primeira).toBe("2026-11-20T10:00:00Z");
    expect(grupos[0].ultima).toBe("2026-11-25T10:00:00Z");
    expect(grupos[0].rotas).toEqual(["/", "/clubes/:id"]);
    expect(grupos[0].exemplo.pilha).toBe("pilha nova");
  });

  it("lista vazia não tem grupos", () => {
    expect(agruparErros([])).toEqual([]);
  });
});
