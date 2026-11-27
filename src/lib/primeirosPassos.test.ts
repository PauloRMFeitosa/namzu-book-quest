import { beforeEach, describe, expect, it } from "vitest";
import {
  gravarMarca,
  lerMarca,
  passosDoRoteiro,
  progressoDoRoteiro,
  situacaoDoClube,
  textoDoProgresso,
  type SituacaoDoClube,
} from "./primeirosPassos";

const nada: SituacaoDoClube = {
  temLivro: false,
  temCronograma: false,
  temEncontro: false,
  paginaNoAr: false,
  viuAPagina: false,
  convidou: false,
  temAviso: false,
};
const tudo: SituacaoDoClube = {
  temLivro: true,
  temCronograma: true,
  temEncontro: true,
  paginaNoAr: true,
  viuAPagina: true,
  convidou: true,
  temAviso: true,
};

describe("passosDoRoteiro", () => {
  it("segue a ordem combinada, com o convite em quinto e o aviso opcional", () => {
    const passos = passosDoRoteiro("c1", nada);
    expect(passos.map((p) => p.chave)).toEqual(["livro", "cronograma", "encontro", "pagina", "convite", "aviso"]);
    expect(passos.filter((p) => p.opcional).map((p) => p.chave)).toEqual(["aviso"]);
  });

  it("leva cada passo ao lugar certo", () => {
    const passos = passosDoRoteiro("c1", nada);
    expect(passos[0].destino).toEqual({ tipo: "rota", rota: "/clubes/c1/trilha/nova" });
    expect(passos[3].destino).toEqual({ tipo: "secao", secao: "pagina" });
    expect(passos[4].destino).toEqual({ tipo: "convidar" });
  });

  it("muda o texto da página conforme ela está no ar", () => {
    expect(passosDoRoteiro("c1", nada)[3].titulo).toMatch(/Publique/);
    const noAr = passosDoRoteiro("c1", { ...nada, paginaNoAr: true })[3];
    expect(noAr.titulo).toMatch(/Conheça/);
    expect(noAr.feito).toBe(false);
    expect(passosDoRoteiro("c1", { ...nada, paginaNoAr: true, viuAPagina: true })[3].feito).toBe(true);
    expect(passosDoRoteiro("c1", { ...nada, viuAPagina: true })[3].feito).toBe(false);
  });
});

describe("progressoDoRoteiro", () => {
  it("conta só os obrigatórios", () => {
    const p = progressoDoRoteiro(passosDoRoteiro("c1", nada));
    expect(p).toMatchObject({ feitos: 0, total: 5, pronto: false, completo: false });
    expect(p.proximo?.chave).toBe("livro");
    expect(textoDoProgresso(p)).toBe("0 de 5 passos");
  });

  it("fica pronto sem o aviso e aponta o opcional como próximo", () => {
    const p = progressoDoRoteiro(passosDoRoteiro("c1", { ...tudo, temAviso: false }));
    expect(p).toMatchObject({ feitos: 5, total: 5, pronto: true, completo: false });
    expect(p.proximo?.chave).toBe("aviso");
  });

  it("o obrigatório vem antes do opcional como próximo", () => {
    const p = progressoDoRoteiro(passosDoRoteiro("c1", { ...tudo, temAviso: false, convidou: false }));
    expect(p.proximo?.chave).toBe("convite");
  });

  it("completo quando não falta nada", () => {
    const p = progressoDoRoteiro(passosDoRoteiro("c1", tudo));
    expect(p).toMatchObject({ pronto: true, completo: true, proximo: null });
  });
});

describe("situacaoDoClube", () => {
  it("sem dados, nada está feito", () => {
    expect(situacaoDoClube({})).toEqual(nada);
  });

  it("cronograma vale com datas ou com meta, e só se há livro", () => {
    expect(situacaoDoClube({ livroAtual: { data_inicio: null, data_fim: null } }).temCronograma).toBe(false);
    expect(situacaoDoClube({ livroAtual: { data_inicio: "2026-12-01", data_fim: "2026-12-28" } }).temCronograma).toBe(true);
    expect(situacaoDoClube({ livroAtual: { data_inicio: null, data_fim: null }, temMeta: true }).temCronograma).toBe(true);
    expect(situacaoDoClube({ temMeta: true }).temCronograma).toBe(false);
  });

  it("encontro vale com data marcada, votação aberta ou encontro já realizado", () => {
    expect(situacaoDoClube({ proximoEncontro: { id: "e" } }).temEncontro).toBe(true);
    expect(situacaoDoClube({ votacaoAberta: true }).temEncontro).toBe(true);
    expect(situacaoDoClube({ encontrosRealizados: 2 }).temEncontro).toBe(true);
  });

  it("convite vale com link gerado, segundo membro ou pedido de entrada", () => {
    expect(situacaoDoClube({ membrosAtivos: 1 }).convidou).toBe(false);
    expect(situacaoDoClube({ membrosAtivos: 2 }).convidou).toBe(true);
    expect(situacaoDoClube({ membrosAtivos: 1, pedidosPendentes: 1 }).convidou).toBe(true);
    expect(situacaoDoClube({ gerouConvite: true }).convidou).toBe(true);
  });
});

describe("marcas do aparelho", () => {
  beforeEach(() => localStorage.clear());

  it("grava, lê e apaga por clube", () => {
    expect(lerMarca("c1", "dispensado")).toBe(false);
    gravarMarca("c1", "dispensado");
    expect(lerMarca("c1", "dispensado")).toBe(true);
    expect(lerMarca("c2", "dispensado")).toBe(false);
    expect(lerMarca("c1", "convite")).toBe(false);
    gravarMarca("c1", "dispensado", false);
    expect(lerMarca("c1", "dispensado")).toBe(false);
  });
});
