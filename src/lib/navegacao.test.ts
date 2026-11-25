import { describe, it, expect } from "vitest";
import {
  destinoAtivo,
  itensVisiveisFoco,
  mostraAbasMinhaLeitura,
  ITENS_NAVEGACAO_FOCO,
  rotaVisitante,
  destinoAoSair,
} from "@/lib/navegacao";

describe("destinoAtivo", () => {
  it("marca Meu clube na raiz e nas rotas de clube", () => {
    expect(destinoAtivo("/")).toBe("clube");
    expect(destinoAtivo("/clubes")).toBe("clube");
    expect(destinoAtivo("/clubes/abc-123")).toBe("clube");
  });

  it("marca Minha leitura em leituras, estante, citações, busca, obras e autores", () => {
    for (const rota of ["/leituras", "/leituras/1", "/livros", "/citacoes", "/busca", "/obras/9", "/autores/7", "/cadastro-manual"]) {
      expect(destinoAtivo(rota)).toBe("leitura");
    }
  });

  it("marca Perfil no perfil próprio, configurações, metas e histórico", () => {
    for (const rota of ["/perfil", "/configuracoes", "/metas", "/historico"]) {
      expect(destinoAtivo(rota)).toBe("perfil");
    }
  });

  it("não marca nada no perfil de outra pessoa, no admin e nas notificações", () => {
    expect(destinoAtivo("/perfis/abc")).toBeNull();
    expect(destinoAtivo("/admin")).toBeNull();
    expect(destinoAtivo("/notificacoes")).toBeNull();
  });

  it("não confunde prefixos parecidos", () => {
    expect(destinoAtivo("/clubesx")).toBeNull();
    expect(destinoAtivo("/livros-antigos")).toBeNull();
  });
});

describe("mostraAbasMinhaLeitura", () => {
  it("aparece só nas listas, não no detalhe da leitura nem na busca", () => {
    expect(mostraAbasMinhaLeitura("/leituras")).toBe(true);
    expect(mostraAbasMinhaLeitura("/livros")).toBe(true);
    expect(mostraAbasMinhaLeitura("/citacoes")).toBe(true);
    expect(mostraAbasMinhaLeitura("/leituras/1")).toBe(false);
    expect(mostraAbasMinhaLeitura("/busca")).toBe(false);
  });
});

describe("itensVisiveisFoco", () => {
  const tudo = { show_clubes: true, show_leituras: true, pages_global_visible: true };

  it("mostra os três destinos com tudo ligado", () => {
    expect(itensVisiveisFoco(tudo, false).map((i) => i.destino)).toEqual(["clube", "leitura", "perfil"]);
  });

  it("esconde o destino cuja flag está desligada", () => {
    expect(itensVisiveisFoco({ ...tudo, show_leituras: false }, false).map((i) => i.destino)).toEqual(["clube", "perfil"]);
    expect(itensVisiveisFoco({ ...tudo, show_clubes: false }, false).map((i) => i.destino)).toEqual(["leitura", "perfil"]);
  });

  it("mantém só o Perfil quando as páginas estão ocultas globalmente", () => {
    expect(itensVisiveisFoco({ ...tudo, pages_global_visible: false }, false).map((i) => i.destino)).toEqual(["perfil"]);
  });

  it("admin vê todos os destinos mesmo com flags desligadas", () => {
    expect(itensVisiveisFoco({ show_clubes: false, show_leituras: false, pages_global_visible: false }, true)).toEqual(ITENS_NAVEGACAO_FOCO);
  });
});

describe("rotaVisitante", () => {
  const entrada = { show_entrada_organizador: true, show_onboarding: true };

  it("mostra a página pública na raiz", () => {
    expect(rotaVisitante("/", entrada)).toEqual({ tipo: "pagina-publica" });
  });

  it("transforma o link antigo do clube em convite", () => {
    expect(rotaVisitante("/clubes/abc-123", entrada)).toEqual({
      tipo: "redirecionar", para: "/convite/abc-123", guardarRetorno: false,
    });
  });

  it("pede login direto nas outras rotas, guardando o retorno", () => {
    for (const rota of ["/clubes", "/leituras", "/perfil", "/clubes/abc/algo"]) {
      expect(rotaVisitante(rota, entrada)).toEqual({ tipo: "redirecionar", para: "/login", guardarRetorno: true });
    }
  });

  it("com a entrada desligada volta ao quiz ou ao login", () => {
    expect(rotaVisitante("/", { show_entrada_organizador: false, show_onboarding: true }))
      .toEqual({ tipo: "redirecionar", para: "/comecar", guardarRetorno: true });
    expect(rotaVisitante("/clubes/abc", { show_entrada_organizador: false, show_onboarding: false }))
      .toEqual({ tipo: "redirecionar", para: "/login", guardarRetorno: true });
  });
});

describe("destinoAoSair", () => {
  it("volta para a página pública quando a entrada do organizador está ligada", () => {
    expect(destinoAoSair({ show_entrada_organizador: true, show_onboarding: true })).toBe("/");
  });

  it("mantém o destino antigo quando está desligada", () => {
    expect(destinoAoSair({ show_entrada_organizador: false, show_onboarding: true })).toBe("/comecar");
    expect(destinoAoSair({ show_entrada_organizador: false, show_onboarding: false })).toBe("/login");
  });
});
