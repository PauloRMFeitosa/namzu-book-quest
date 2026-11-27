import { describe, expect, it } from "vitest";
import {
  PLANO_VAZIO,
  RECURSOS,
  centavosDoTexto,
  chaveDoNome,
  descontoAnual,
  excessosDoOrganizador,
  formatarPreco,
  limitesDoPlano,
  montarPlano,
  organizadoresPorPlano,
  planoDoOrganizador,
  planoParaFormulario,
  planosAtivos,
  textoDoLimite,
  validarPlano,
  type OrganizadorComPlano,
  type Plano,
} from "./planos";

const plano = (parte: Partial<Plano> = {}): Plano => ({
  id: "p1",
  chave: "basico",
  nome: "Básico",
  descricao: null,
  preco_mensal_centavos: 0,
  preco_anual_centavos: null,
  dias_de_teste: 0,
  limite_membros: 30,
  limite_clubes: 1,
  limite_co_curadores: 1,
  limite_ia_mes: 0,
  recursos: ["trilha"],
  publicado: false,
  destaque: false,
  padrao: true,
  ordem: 1,
  arquivado_em: null,
  ...parte,
});

const organizador = (parte: Partial<OrganizadorComPlano> = {}): OrganizadorComPlano => ({
  user_id: "u1",
  nome: "Ana",
  clubes: 1,
  maior_clube: 10,
  co_curadores: 0,
  plano_id: null,
  origem: null,
  valido_ate: null,
  observacao: null,
  ...parte,
});

describe("catálogo de recursos", () => {
  it("não repete chave", () => {
    const chaves = RECURSOS.map((r) => r.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe("chaveDoNome", () => {
  it("tira acento, espaço e símbolo", () => {
    expect(chaveDoNome("Clube do Livro Pró!")).toBe("clube-do-livro-pro");
    expect(chaveDoNome("  Básico  ")).toBe("basico");
  });
});

describe("preço", () => {
  it("lê valor com vírgula ou ponto", () => {
    expect(centavosDoTexto("19,90")).toBe(1990);
    expect(centavosDoTexto("R$ 49.9")).toBe(4990);
    expect(centavosDoTexto("199")).toBe(19900);
    expect(centavosDoTexto("")).toBeNull();
    expect(centavosDoTexto("abc")).toBeNaN();
  });

  it("mostra grátis quando é zero", () => {
    expect(formatarPreco(0)).toBe("Grátis");
    expect(formatarPreco(1990)).toMatch(/19,90/);
  });

  it("calcula o desconto do anual", () => {
    expect(descontoAnual(1990, 19900)).toBe(17);
    expect(descontoAnual(1990, 23880)).toBeNull();
    expect(descontoAnual(0, 100)).toBeNull();
    expect(descontoAnual(1990, null)).toBeNull();
  });
});

describe("validarPlano", () => {
  const ok = { ...PLANO_VAZIO, nome: "Organizador", chave: "organizador", precoMensal: "19,90", limiteMembros: "150" };

  it("aceita um plano completo e um só com nome", () => {
    expect(validarPlano(ok)).toBeNull();
    expect(validarPlano({ ...PLANO_VAZIO, nome: "Livre", chave: "livre" })).toBeNull();
  });

  it("pede nome e identificador válido", () => {
    expect(validarPlano({ ...ok, nome: " " })).toMatch(/nome/);
    expect(validarPlano({ ...ok, chave: "Com Espaço" })).toMatch(/identificador/);
    expect(validarPlano(ok, ["organizador"])).toMatch(/Já existe/);
  });

  it("recusa preço e limite inválidos", () => {
    expect(validarPlano({ ...ok, precoMensal: "dez" })).toMatch(/mensal/);
    expect(validarPlano({ ...ok, precoAnual: "1,999" })).toMatch(/anual/);
    expect(validarPlano({ ...ok, limiteMembros: "0" })).toMatch(/membros/);
    expect(validarPlano({ ...ok, limiteClubes: "-1" })).toMatch(/clubes/);
    expect(validarPlano({ ...ok, diasDeTeste: "120" })).toMatch(/teste/);
  });

  it("aceita zero em co-curadores e em IA", () => {
    expect(validarPlano({ ...ok, limiteCoCuradores: "0", limiteIaMes: "0" })).toBeNull();
  });
});

describe("montarPlano e planoParaFormulario", () => {
  it("vazio em limite vira sem limite", () => {
    const dados = montarPlano({ ...PLANO_VAZIO, nome: " Pro ", chave: "pro", precoMensal: "49,90", limiteIaMes: "500" });
    expect(dados.nome).toBe("Pro");
    expect(dados.preco_mensal_centavos).toBe(4990);
    expect(dados.preco_anual_centavos).toBeNull();
    expect(dados.limite_membros).toBeNull();
    expect(dados.limite_ia_mes).toBe(500);
    expect(dados.dias_de_teste).toBe(0);
  });

  it("descarta recurso que não está no catálogo e mantém a ordem do catálogo", () => {
    const dados = montarPlano({ ...PLANO_VAZIO, nome: "X", chave: "xx", recursos: ["encontros", "inventado", "trilha"] });
    expect(dados.recursos).toEqual(["trilha", "encontros"]);
  });

  it("vai e volta sem mudar nada", () => {
    const original = plano({ preco_mensal_centavos: 1990, preco_anual_centavos: 19900, dias_de_teste: 14, limite_membros: null, descricao: "Oi" });
    const { id, arquivado_em, ...esperado } = original;
    expect(montarPlano(planoParaFormulario(original))).toEqual(esperado);
  });
});

describe("limites", () => {
  it("escreve cada caso", () => {
    expect(textoDoLimite(30, "membro", "membros", "por clube")).toBe("Até 30 membros por clube");
    expect(textoDoLimite(1, "clube", "clubes")).toBe("Até 1 clube");
    expect(textoDoLimite(null, "clube", "clubes")).toBe("Clubes sem limite");
    expect(textoDoLimite(0, "uso de IA", "usos de IA", "por mês")).toBe("Sem usos de IA");
  });

  it("lista os quatro limites do plano", () => {
    expect(limitesDoPlano(plano())).toHaveLength(4);
  });
});

describe("organizadores e planos", () => {
  const basico = plano();
  const pro = plano({ id: "p2", chave: "pro", nome: "Pro", padrao: false, limite_membros: null, limite_clubes: null, limite_co_curadores: null, ordem: 2 });

  it("quem não tem plano atribuído cai no padrão", () => {
    expect(planoDoOrganizador(organizador(), [basico, pro])?.id).toBe("p1");
    expect(planoDoOrganizador(organizador({ plano_id: "p2" }), [basico, pro])?.id).toBe("p2");
    expect(planoDoOrganizador(organizador(), [pro])).toBeNull();
  });

  it("aponta o que passa do limite", () => {
    expect(excessosDoOrganizador(organizador(), basico)).toEqual([]);
    expect(excessosDoOrganizador(organizador({ clubes: 2, maior_clube: 45, co_curadores: 3 }), basico)).toHaveLength(3);
    expect(excessosDoOrganizador(organizador({ clubes: 9, maior_clube: 900 }), pro)).toEqual([]);
    expect(excessosDoOrganizador(organizador({ clubes: 9 }), null)).toEqual([]);
  });

  it("conta organizadores por plano", () => {
    const lista = [organizador(), organizador({ user_id: "u2", plano_id: "p2" }), organizador({ user_id: "u3" })];
    expect(organizadoresPorPlano(lista, [basico, pro])).toEqual({ p1: 2, p2: 1 });
  });

  it("esconde arquivado e ordena", () => {
    const arquivado = plano({ id: "p3", chave: "velho", padrao: false, arquivado_em: "2026-01-01" });
    expect(planosAtivos([pro, arquivado, basico]).map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});
