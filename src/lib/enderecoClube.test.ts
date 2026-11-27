import { describe, expect, it } from "vitest";
import {
  enderecoDoHost,
  limparEndereco,
  linkDaPagina,
  linkParaOApp,
  linkPorSubdominio,
  quandoDoEncontro,
  resumoDaPagina,
  semProtocolo,
  sugerirEndereco,
  textoDeMembros,
  validarEndereco,
} from "./enderecoClube";

describe("sugerirEndereco e limparEndereco", () => {
  it("tira acento, espaço e símbolo", () => {
    expect(sugerirEndereco("Leitoras do Cariri")).toBe("leitoras-do-cariri");
    expect(sugerirEndereco("  Clube & Café!  ")).toBe("clube-cafe");
  });

  it("não sugere nome curto ou reservado", () => {
    expect(sugerirEndereco("Blog")).toBe("clube-blog");
    expect(sugerirEndereco("Lê")).toBe("clube-le");
    expect(sugerirEndereco("!!!")).toBe("");
  });

  it("enquanto a pessoa digita, mantém o hífen do fim", () => {
    expect(limparEndereco("Leitoras do ")).toBe("leitoras-do-");
    expect(limparEndereco("-começo")).toBe("comeco");
  });

  it("corta em 40 caracteres", () => {
    expect(sugerirEndereco("a".repeat(60))).toHaveLength(40);
  });
});

describe("validarEndereco", () => {
  it("aceita endereço bem formado", () => {
    expect(validarEndereco("leitoras-do-cariri")).toBeNull();
    expect(validarEndereco("clube2026")).toBeNull();
  });

  it("recusa vazio, curto, mal formado e reservado", () => {
    expect(validarEndereco("")).toMatch(/Escolha/);
    expect(validarEndereco("ab")).toMatch(/pelo menos 3/);
    expect(validarEndereco("a".repeat(41))).toMatch(/até 40/);
    expect(validarEndereco("Com Espaço")).toMatch(/letras minúsculas/);
    expect(validarEndereco("fim-")).toMatch(/hífen/);
    expect(validarEndereco("dois--hifens")).toMatch(/hífen/);
    expect(validarEndereco("admin")).toMatch(/reservado/);
  });
});

describe("enderecoDoHost", () => {
  it("lê o clube do subdomínio", () => {
    expect(enderecoDoHost("leitoras.namzu.com.br")).toBe("leitoras");
    expect(enderecoDoHost("Leitoras-do-Cariri.NAMZU.com.br")).toBe("leitoras-do-cariri");
    expect(enderecoDoHost("leitoras.localhost")).toBe("leitoras");
  });

  it("ignora o domínio principal, www, reservados e outros sites", () => {
    expect(enderecoDoHost("namzu.com.br")).toBeNull();
    expect(enderecoDoHost("www.namzu.com.br")).toBeNull();
    expect(enderecoDoHost("blog.namzu.com.br")).toBeNull();
    expect(enderecoDoHost("a.b.namzu.com.br")).toBeNull();
    expect(enderecoDoHost("namzu-two.vercel.app")).toBeNull();
    expect(enderecoDoHost("localhost")).toBeNull();
    expect(enderecoDoHost("127.0.0.1")).toBeNull();
    expect(enderecoDoHost("falsonamzu.com.br")).toBeNull();
  });
});

describe("links", () => {
  it("monta os dois endereços", () => {
    expect(linkDaPagina("leitoras")).toBe("https://namzu.com.br/c/leitoras");
    expect(linkPorSubdominio("leitoras")).toBe("https://leitoras.namzu.com.br");
    expect(semProtocolo("https://leitoras.namzu.com.br")).toBe("leitoras.namzu.com.br");
  });

  it("no subdomínio, manda para o domínio principal", () => {
    expect(linkParaOApp("/convite/1", false)).toBe("/convite/1");
    expect(linkParaOApp("/convite/1", true, "leitoras.namzu.com.br")).toBe("https://namzu.com.br/convite/1");
    expect(linkParaOApp("/convite/1", true, "leitoras.localhost")).toBe("/convite/1");
  });
});

describe("textos da página", () => {
  it("escreve a data do encontro", () => {
    expect(quandoDoEncontro("2026-12-11T22:30:00Z", "America/Sao_Paulo")).toBe("11 de dezembro, sexta-feira, às 19h30");
    expect(quandoDoEncontro("2026-12-11T22:00:00Z", "America/Sao_Paulo")).toBe("11 de dezembro, sexta-feira, às 19h");
  });

  it("conta membros", () => {
    expect(textoDeMembros(1)).toBe("1 membro");
    expect(textoDeMembros(32)).toBe("32 membros");
  });

  it("resume para o compartilhamento", () => {
    expect(resumoDaPagina({ nome: "Leitoras", descricao: "  Lemos\n juntas. ", livro_atual: null })).toBe("Lemos juntas.");
    expect(resumoDaPagina({ nome: "Leitoras", descricao: "x".repeat(300), livro_atual: null })).toHaveLength(160);
    expect(resumoDaPagina({ nome: "Leitoras", descricao: null, livro_atual: { titulo: "Torto Arado", autor: null, capa_url: null } })).toMatch(/Torto Arado/);
    expect(resumoDaPagina({ nome: "Leitoras", descricao: "", livro_atual: null })).toBe("Leitoras é um clube de leitura no NAMZU.");
  });
});
