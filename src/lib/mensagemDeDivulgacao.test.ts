import { beforeEach, describe, expect, it } from "vitest";
import {
  MAXIMO_MENSAGEM_DE_DIVULGACAO,
  chaveDaMensagem,
  gravarMensagem,
  lerMensagem,
  montarMensagem,
  textoPadraoDaMensagem,
} from "./mensagemDeDivulgacao";

const LINK = "https://namzu.com.br/c/leitoras";

describe("montarMensagem", () => {
  it("põe o link no fim do texto", () => {
    expect(montarMensagem("Venha ler com a gente!", LINK)).toBe(`Venha ler com a gente! ${LINK}`);
    expect(montarMensagem("  Com espaços  ", LINK)).toBe(`Com espaços ${LINK}`);
  });

  it("sem texto, manda só o link", () => {
    expect(montarMensagem("", LINK)).toBe(LINK);
    expect(montarMensagem("   ", LINK)).toBe(LINK);
  });

  it("não repete o link que a pessoa já colou", () => {
    expect(montarMensagem(`Entre por ${LINK} e traga um amigo`, LINK)).toBe(`Entre por ${LINK} e traga um amigo`);
  });
});

describe("texto padrão", () => {
  it("muda conforme é página ou convite", () => {
    expect(textoPadraoDaMensagem("pagina", "Leitoras")).toBe('Conheça o nosso clube de leitura "Leitoras":');
    expect(textoPadraoDaMensagem("convite", "Leitoras")).toBe('Entre no nosso clube de leitura "Leitoras" pelo NAMZU:');
  });
});

describe("texto guardado no aparelho", () => {
  beforeEach(() => localStorage.clear());

  it("sem nada guardado, devolve o padrão", () => {
    expect(lerMensagem("pagina", "c1", "Leitoras")).toBe(textoPadraoDaMensagem("pagina", "Leitoras"));
  });

  it("guarda por clube e por tipo", () => {
    gravarMensagem("pagina", "c1", "Leitoras", "Meu texto");
    expect(lerMensagem("pagina", "c1", "Leitoras")).toBe("Meu texto");
    expect(lerMensagem("convite", "c1", "Leitoras")).toBe(textoPadraoDaMensagem("convite", "Leitoras"));
    expect(lerMensagem("pagina", "c2", "Outro")).toBe(textoPadraoDaMensagem("pagina", "Outro"));
  });

  it("voltar ao padrão ou apagar tudo limpa o que estava guardado", () => {
    gravarMensagem("pagina", "c1", "Leitoras", "Meu texto");
    gravarMensagem("pagina", "c1", "Leitoras", textoPadraoDaMensagem("pagina", "Leitoras"));
    expect(localStorage.getItem(chaveDaMensagem("pagina", "c1"))).toBeNull();
    gravarMensagem("pagina", "c1", "Leitoras", "Outro");
    gravarMensagem("pagina", "c1", "Leitoras", "  ");
    expect(lerMensagem("pagina", "c1", "Leitoras")).toBe(textoPadraoDaMensagem("pagina", "Leitoras"));
  });

  it("corta no tamanho máximo", () => {
    gravarMensagem("pagina", "c1", "Leitoras", "x".repeat(900));
    expect(lerMensagem("pagina", "c1", "Leitoras")).toHaveLength(MAXIMO_MENSAGEM_DE_DIVULGACAO);
  });
});
