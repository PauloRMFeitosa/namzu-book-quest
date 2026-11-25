import { describe, it, expect } from "vitest";
import { extrairClubeDoConvite, linkConvite, linkDoClube, mensagemConvite } from "@/lib/convite";

const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("extrairClubeDoConvite", () => {
  it("lê o link novo de convite", () => {
    expect(extrairClubeDoConvite(`https://www.namzu.com.br/convite/${ID}`)).toBe(ID);
  });

  it("lê o link antigo do clube, com parâmetros", () => {
    expect(extrairClubeDoConvite(`https://www.namzu.com.br/clubes/${ID}?tab=feed`)).toBe(ID);
  });

  it("lê o link no meio de uma mensagem colada", () => {
    expect(extrairClubeDoConvite(`Oi! Entra aqui: https://namzu.com.br/convite/${ID} te espero`)).toBe(ID);
  });

  it("aceita o id sozinho e normaliza para minúsculas", () => {
    expect(extrairClubeDoConvite(`  ${ID.toUpperCase()}  `)).toBe(ID);
  });

  it("recusa texto sem link de clube", () => {
    expect(extrairClubeDoConvite("")).toBeNull();
    expect(extrairClubeDoConvite("https://www.namzu.com.br/perfil")).toBeNull();
    expect(extrairClubeDoConvite("https://www.namzu.com.br/clubes/abc")).toBeNull();
    expect(extrairClubeDoConvite(`https://www.namzu.com.br/obras/${ID}`)).toBeNull();
  });
});

describe("linkConvite", () => {
  it("usa o domínio oficial em produção, com ou sem www", () => {
    expect(linkConvite(ID, "https://namzu.com.br")).toBe(`https://www.namzu.com.br/convite/${ID}`);
    expect(linkConvite(ID, "https://www.namzu.com.br")).toBe(`https://www.namzu.com.br/convite/${ID}`);
  });

  it("mantém a origem em preview e em desenvolvimento", () => {
    expect(linkConvite(ID, "https://namzu-git-x.vercel.app")).toBe(`https://namzu-git-x.vercel.app/convite/${ID}`);
    expect(linkConvite(ID, "http://localhost:8080")).toBe(`http://localhost:8080/convite/${ID}`);
  });

  it("não confunde domínio parecido com o oficial", () => {
    expect(linkConvite(ID, "https://falsonamzu.com.br")).toBe(`https://falsonamzu.com.br/convite/${ID}`);
  });
});

describe("linkDoClube", () => {
  it("usa o domínio oficial em produção e aceita a aba", () => {
    expect(linkDoClube(ID, "leituras", "https://namzu.com.br")).toBe(`https://www.namzu.com.br/clubes/${ID}?tab=leituras`);
    expect(linkDoClube(ID, undefined, "http://localhost:8080")).toBe(`http://localhost:8080/clubes/${ID}`);
  });
});

describe("mensagemConvite", () => {
  it("inclui o nome do clube e o link", () => {
    const msg = mensagemConvite("Leitoras do Cariri", "https://x/convite/1");
    expect(msg).toContain("Leitoras do Cariri");
    expect(msg).toContain("https://x/convite/1");
  });
});
