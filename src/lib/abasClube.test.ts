import { describe, expect, it } from "vitest";
import { dividirAbas } from "./abasClube";

const abas = (...valores: string[]) => valores.map((value) => ({ value }));
const nomes = (lista: { value: string }[]) => lista.map((a) => a.value);

describe("dividirAbas", () => {
  it("organizador com tudo ligado: cinco na barra e quatro em Mais", () => {
    const d = dividirAbas(abas("visao", "feed", "leituras", "canais", "eventos", "membros", "conteudos", "microgrupos", "gestao"));
    expect(nomes(d.naBarra)).toEqual(["visao", "feed", "leituras", "eventos", "membros"]);
    expect(nomes(d.emMais)).toEqual(["canais", "conteudos", "microgrupos", "gestao"]);
  });

  it("membro com tudo ligado: quatro principais, uma promovida e o resto em Mais", () => {
    const d = dividirAbas(abas("feed", "leituras", "canais", "eventos", "membros", "conteudos", "microgrupos"));
    expect(nomes(d.naBarra)).toEqual(["feed", "leituras", "eventos", "membros", "canais"]);
    expect(nomes(d.emMais)).toEqual(["conteudos", "microgrupos"]);
  });

  it("até seis abas ficam todas na barra, na ordem original", () => {
    const seis = abas("visao", "feed", "leituras", "eventos", "membros", "gestao");
    expect(dividirAbas(seis)).toEqual({ naBarra: seis, emMais: [] });
    const cinco = abas("feed", "leituras", "canais", "eventos", "membros");
    expect(nomes(dividirAbas(cinco).naBarra)).toEqual(["feed", "leituras", "canais", "eventos", "membros"]);
  });

  it("Mais nunca abre com uma aba só", () => {
    const todas = ["visao", "feed", "leituras", "canais", "eventos", "membros", "conteudos", "microgrupos", "gestao"];
    for (let i = 1; i <= todas.length; i++) {
      const d = dividirAbas(abas(...todas.slice(0, i)));
      expect(d.emMais.length).not.toBe(1);
      expect(d.naBarra.length + (d.emMais.length ? 1 : 0)).toBeLessThanOrEqual(6);
    }
  });

  it("não perde nem repete aba", () => {
    const todas = abas("visao", "feed", "canais", "membros", "conteudos", "microgrupos", "gestao");
    const d = dividirAbas(todas);
    expect([...nomes(d.naBarra), ...nomes(d.emMais)].sort()).toEqual(nomes(todas).sort());
  });
});
