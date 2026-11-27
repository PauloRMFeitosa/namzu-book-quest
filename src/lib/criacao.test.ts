import { beforeEach, describe, expect, it } from "vitest";
import {
  CANAL_VAZIO,
  MICROGRUPO_VAZIO,
  escreverDatasDaVotacao,
  lerDatasDaVotacao,
  montarCanal,
  montarMicrogrupo,
  normalizarNomeCanal,
  validarNovoCanal,
  validarNovoMicrogrupo,
  CLUBE_VAZIO,
  CONTEUDO_VAZIO,
  ENCONTRO_VAZIO,
  explicarLiberacao,
  explicarVisibilidade,
  lerRascunho,
  montarConteudo,
  montarEncontro,
  validarNovoClube,
  validarNovoConteudo,
  validarNovoEncontro,
} from "./criacao";

describe("lerRascunho", () => {
  beforeEach(() => localStorage.clear());

  it("devolve o vazio quando não há rascunho ou ele está quebrado", () => {
    expect(lerRascunho("x", CLUBE_VAZIO)).toEqual(CLUBE_VAZIO);
    localStorage.setItem("x", "{quebrado");
    expect(lerRascunho("x", CLUBE_VAZIO)).toEqual(CLUBE_VAZIO);
    localStorage.setItem("x", "[1]");
    expect(lerRascunho("x", CLUBE_VAZIO).nome).toBe("");
  });

  it("aproveita só os campos conhecidos e do tipo certo", () => {
    localStorage.setItem("x", JSON.stringify({ nome: "Leitoras", visibilidade: 3, intruso: "x" }));
    const lido = lerRascunho("x", CLUBE_VAZIO);
    expect(lido.nome).toBe("Leitoras");
    expect(lido.visibilidade).toBe("publico");
    expect("intruso" in lido).toBe(false);
  });
});

describe("validarNovoClube", () => {
  it("aceita nome e endereço", () => {
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: "Leitoras do Cariri", endereco: "leitoras-do-cariri" })).toBeNull();
  });

  it("pede um endereço válido para a página", () => {
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: "Leitoras do Cariri" })).toMatch(/Endereço da página: escolha/);
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: "Leitoras", endereco: "admin" })).toMatch(/Endereço da página: esse endereço é reservado/);
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: "Leitoras", endereco: "ab" })).toMatch(/pelo menos 3/);
  });

  it("aponta o primeiro problema", () => {
    expect(validarNovoClube(CLUBE_VAZIO)).toMatch(/Dê um nome/);
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: " ab " })).toMatch(/pelo menos 3/);
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: "x".repeat(81) })).toMatch(/80 letras/);
    expect(validarNovoClube({ ...CLUBE_VAZIO, nome: "Clube", visibilidade: "secreto" })).toMatch(/quem pode entrar/);
  });

  it("explica a visibilidade", () => {
    expect(explicarVisibilidade("publico")).toMatch(/qualquer pessoa/);
    expect(explicarVisibilidade("privado")).toMatch(/aprova cada pedido/);
  });
});

describe("validarNovoEncontro", () => {
  const agora = new Date(2026, 10, 25, 12, 0);
  const certo = { ...ENCONTRO_VAZIO, titulo: "Encontro de dezembro", inicio: "2026-12-05T19:30" };

  it("aceita título e início no futuro", () => {
    expect(validarNovoEncontro(certo, agora)).toBeNull();
    expect(
      validarNovoEncontro({ ...certo, fim: "2026-12-05T21:00", url: "https://meet.example.com/abc", limite: "20" }, agora),
    ).toBeNull();
  });

  it("aponta o primeiro problema", () => {
    expect(validarNovoEncontro({ ...certo, titulo: " " }, agora)).toMatch(/título/);
    expect(validarNovoEncontro({ ...certo, inicio: "" }, agora)).toMatch(/dia e a hora/);
    expect(validarNovoEncontro({ ...certo, inicio: "2026-11-20T19:30" }, agora)).toMatch(/no futuro/);
    expect(validarNovoEncontro({ ...certo, fim: "2026-12-05T19:30" }, agora)).toMatch(/depois do início/);
    expect(validarNovoEncontro({ ...certo, url: "meet.example.com" }, agora)).toMatch(/https/);
    expect(validarNovoEncontro({ ...certo, url: "javascript:alert(1)" }, agora)).toMatch(/https/);
    expect(validarNovoEncontro({ ...certo, limite: "0" }, agora)).toMatch(/limite/);
    expect(validarNovoEncontro({ ...certo, limite: "2,5" }, agora)).toMatch(/limite/);
  });

  it("monta os dados no formato do banco", () => {
    const dados = montarEncontro({ ...certo, titulo: "  Encontro  ", limite: "20", url: " https://x.example.com " });
    expect(dados.titulo).toBe("Encontro");
    expect(dados.inicio_em).toBe(new Date(2026, 11, 5, 19, 30).toISOString());
    expect(dados.fim_em).toBeNull();
    expect(dados.url_evento).toBe("https://x.example.com");
    expect(dados.limite_participantes).toBe(20);
    expect(dados.descricao).toBeUndefined();
  });
});

describe("validarNovoConteudo", () => {
  const certo = { ...CONTEUDO_VAZIO, titulo: "Aula 1", url_conteudo: "https://video.example.com/1" };

  it("aceita título e link", () => {
    expect(validarNovoConteudo(certo)).toBeNull();
  });

  it("aponta o primeiro problema", () => {
    expect(validarNovoConteudo({ ...certo, titulo: "" })).toMatch(/título/);
    expect(validarNovoConteudo({ ...certo, url_conteudo: "" })).toMatch(/Informe o link/);
    expect(validarNovoConteudo({ ...certo, url_conteudo: "video.example.com" })).toMatch(/https/);
    expect(validarNovoConteudo({ ...certo, liberado_apos_dias: "-1" })).toMatch(/dias de espera/);
    expect(validarNovoConteudo({ ...certo, liberado_apos_dias: "abc" })).toMatch(/dias de espera/);
  });

  it("explica a liberação e monta os dados", () => {
    expect(explicarLiberacao("0")).toMatch(/assim que/);
    expect(explicarLiberacao("")).toMatch(/assim que/);
    expect(explicarLiberacao("1")).toMatch(/1 dia depois/);
    expect(explicarLiberacao("7")).toMatch(/7 dias depois/);
    expect(montarConteudo({ ...certo, liberado_apos_dias: "" }, 4)).toEqual({
      titulo: "Aula 1",
      descricao: undefined,
      tipo: "video",
      url_conteudo: "https://video.example.com/1",
      ordem_liberacao: 4,
      liberado_apos_dias: 0,
    });
  });
});

describe("canal", () => {
  it("normaliza o nome enquanto a pessoa digita", () => {
    expect(normalizarNomeCanal("Discussão Geral")).toBe("discussao-geral");
    expect(normalizarNomeCanal("Capítulo 3: o fim!")).toBe("capitulo-3-o-fim");
    expect(normalizarNomeCanal("a  --  b")).toBe("a-b");
    expect(normalizarNomeCanal("x".repeat(60))).toHaveLength(40);
  });

  it("valida nome, repetição e descrição", () => {
    expect(validarNovoCanal(CANAL_VAZIO)).toMatch(/Dê um nome/);
    expect(validarNovoCanal({ ...CANAL_VAZIO, nome: "-" })).toMatch(/Dê um nome/);
    expect(validarNovoCanal({ ...CANAL_VAZIO, nome: "a" })).toMatch(/pelo menos 2/);
    expect(validarNovoCanal({ ...CANAL_VAZIO, nome: "geral" }, ["geral"])).toMatch(/Já existe/);
    expect(validarNovoCanal({ nome: "geral", descricao: "x".repeat(201) })).toMatch(/200 letras/);
    expect(validarNovoCanal({ ...CANAL_VAZIO, nome: "geral" }, ["avisos"])).toBeNull();
    expect(montarCanal({ nome: "-geral-", descricao: "  Conversa livre " })).toEqual({ nome: "geral", descricao: "Conversa livre" });
  });
});

describe("microgrupo", () => {
  const certo = { ...MICROGRUPO_VAZIO, nome: "Filosofia matinal" };

  it("valida nome e limite", () => {
    expect(validarNovoMicrogrupo(MICROGRUPO_VAZIO)).toMatch(/Dê um nome/);
    expect(validarNovoMicrogrupo(certo)).toBeNull();
    expect(validarNovoMicrogrupo({ ...certo, limite: "1" })).toMatch(/entre 2 e 50/);
    expect(validarNovoMicrogrupo({ ...certo, limite: "51" })).toMatch(/entre 2 e 50/);
    expect(validarNovoMicrogrupo({ ...certo, limite: "" })).toMatch(/entre 2 e 50/);
    expect(validarNovoMicrogrupo({ ...certo, nome: "x".repeat(61) })).toMatch(/60 letras/);
  });

  it("monta os dados no formato do banco", () => {
    expect(montarMicrogrupo({ ...certo, limite: "8", privado: false })).toEqual({
      nome: "Filosofia matinal",
      descricao: undefined,
      tipo: "fixo",
      limite_membros: 8,
      privado: false,
    });
  });
});

describe("datas da votação no rascunho", () => {
  it("vai e volta sem perder campos vazios", () => {
    expect(lerDatasDaVotacao("|")).toEqual(["", ""]);
    const datas = ["2026-12-05T19:30", "", "2026-12-12T19:30"];
    expect(lerDatasDaVotacao(escreverDatasDaVotacao(datas))).toEqual(datas);
  });
});
