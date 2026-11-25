import { describe, expect, it } from "vitest";
import {
  alternarVoto,
  mensagemDaVotacao,
  opcaoMaisVotada,
  opcoesEmOrdem,
  opcoesParaEnvio,
  textoDeVotantes,
  textoDeVotos,
  totalDeVotantes,
  validarVotacao,
  votosDe,
  type OpcaoDeData,
} from "./votacaoData";

const agora = new Date(2026, 10, 25, 15, 0, 0);
const opcao = (id: string, dia: number, votos: string[] = []): OpcaoDeData => ({
  id,
  inicio_em: new Date(2026, 10, dia, 19, 30).toISOString(),
  votos,
});

describe("opcoesParaEnvio", () => {
  it("ignora vazias e inválidas, tira repetidas e ordena", () => {
    const envio = opcoesParaEnvio(["2026-11-28T19:30", "", "2026-11-27T19:30", "2026-11-28T19:30", "nada"]);
    expect(envio).toEqual([new Date("2026-11-27T19:30").toISOString(), new Date("2026-11-28T19:30").toISOString()]);
  });
});

describe("validarVotacao", () => {
  const duas = ["2026-11-27T19:30", "2026-11-28T19:30"];

  it("aceita nome e de 2 a 6 datas futuras", () => {
    expect(validarVotacao("Fechamento do livro", duas, agora)).toBeNull();
    expect(validarVotacao("Encontro", [...duas, "", ""], agora)).toBeNull();
  });

  it("aponta o primeiro problema", () => {
    expect(validarVotacao("  ", duas, agora)).toBe("Dê um nome para o encontro.");
    expect(validarVotacao("x".repeat(121), duas, agora)).toMatch(/120 letras/);
    expect(validarVotacao("Encontro", ["2026-11-27T19:30"], agora)).toBe("Proponha pelo menos 2 datas.");
    expect(validarVotacao("Encontro", ["2026-11-27T19:30", "2026-11-27T19:30"], agora)).toBe("Há datas repetidas.");
    expect(validarVotacao("Encontro", ["2026-11-27T19:30", "nada"], agora)).toBe("Há uma data inválida.");
    expect(validarVotacao("Encontro", ["2026-11-25T14:00", "2026-11-28T19:30"], agora)).toBe(
      "Todas as datas precisam estar no futuro.",
    );
    const sete = Array.from({ length: 7 }, (_, i) => `2026-12-0${i + 1}T19:30`);
    expect(validarVotacao("Encontro", sete, agora)).toBe("Proponha no máximo 6 datas.");
  });
});

describe("placar da votação", () => {
  const votacao = {
    opcoes: [opcao("c", 29, ["u1"]), opcao("a", 27, ["u1", "u2"]), opcao("b", 28, ["u2", "u3"])],
  };

  it("ordena as datas", () => {
    expect(opcoesEmOrdem(votacao).map((o) => o.id)).toEqual(["a", "b", "c"]);
  });

  it("conta pessoas, não votos", () => {
    expect(totalDeVotantes(votacao)).toBe(3);
    expect(totalDeVotantes({ opcoes: [opcao("a", 27)] })).toBe(0);
  });

  it("sabe em que datas cada pessoa votou", () => {
    expect(votosDe(votacao, "u2").sort()).toEqual(["a", "b"]);
    expect(votosDe(votacao, "ninguem")).toEqual([]);
    expect(votosDe(votacao, undefined)).toEqual([]);
  });

  it("a mais votada desempata pela data mais próxima", () => {
    expect(opcaoMaisVotada(votacao)?.id).toBe("a");
    expect(opcaoMaisVotada({ opcoes: [opcao("a", 27, ["u1"]), opcao("b", 28, ["u1", "u2"])] })?.id).toBe("b");
  });

  it("sem votos, não há mais votada", () => {
    expect(opcaoMaisVotada({ opcoes: [opcao("a", 27), opcao("b", 28)] })).toBeNull();
    expect(opcaoMaisVotada({ opcoes: [] })).toBeNull();
  });

  it("marca e desmarca uma data", () => {
    expect(alternarVoto(["a"], "b")).toEqual(["a", "b"]);
    expect(alternarVoto(["a", "b"], "a")).toEqual(["b"]);
  });

  it("escreve os totais com singular e plural", () => {
    expect(textoDeVotos(0)).toBe("Nenhum voto");
    expect(textoDeVotos(1)).toBe("1 voto");
    expect(textoDeVotos(4)).toBe("4 votos");
    expect(textoDeVotantes(0)).toBe("Ninguém votou ainda");
    expect(textoDeVotantes(1)).toBe("1 pessoa votou");
    expect(textoDeVotantes(4)).toBe("4 pessoas votaram");
  });
});

describe("mensagemDaVotacao", () => {
  it("lista as datas em ordem com o link do clube", () => {
    const texto = mensagemDaVotacao({
      nomeClube: "Leitoras do Cariri",
      votacao: { titulo: "Fechamento do livro", opcoes: [opcao("b", 28), opcao("a", 26)] },
      link: "https://www.namzu.com.br/clubes/x?tab=eventos",
      agora,
    });
    expect(texto).toBe(
      [
        "🗳️ Leitoras do Cariri",
        "Estamos escolhendo a data de: Fechamento do livro",
        "• Amanhã, às 19:30",
        "• Sáb., 28/11, às 19:30",
        "",
        "Marque quando você pode: https://www.namzu.com.br/clubes/x?tab=eventos",
      ].join("\n"),
    );
  });
});
