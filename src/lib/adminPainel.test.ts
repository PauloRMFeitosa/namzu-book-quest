import { describe, expect, it } from "vitest";
import {
  haQuantoTempo,
  nomeDoEvento,
  pendenciasDoPainel,
  picoDaSerie,
  situacaoDoClube,
  type ClubeNoPainel,
  type PainelDoAdmin,
} from "./adminPainel";

const agora = new Date(2026, 10, 26, 12, 0);
const diasAtras = (n: number) => new Date(agora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const clube = (extra: Partial<ClubeNoPainel> = {}): ClubeNoPainel => ({
  id: "c1",
  nome: "Clube",
  ativo: true,
  visibilidade: "publico",
  criado_em: diasAtras(90),
  organizador: "Ana",
  membros: 5,
  pendentes: 0,
  livros_na_trilha: 2,
  proximo_encontro: null,
  ultima_atividade: diasAtras(1),
  acoes_no_periodo: 3,
  ...extra,
});

describe("situacaoDoClube", () => {
  it("separa em uso, parado, sem uso e desativado", () => {
    expect(situacaoDoClube(clube(), agora)).toBe("em_uso");
    expect(situacaoDoClube(clube({ ultima_atividade: diasAtras(7) }), agora)).toBe("em_uso");
    expect(situacaoDoClube(clube({ ultima_atividade: diasAtras(8) }), agora)).toBe("parado");
    expect(situacaoDoClube(clube({ ultima_atividade: null }), agora)).toBe("sem_uso");
    expect(situacaoDoClube(clube({ ativo: false }), agora)).toBe("desativado");
  });
});

describe("haQuantoTempo", () => {
  it("escreve o tempo de forma curta", () => {
    expect(haQuantoTempo(null, agora)).toBe("nunca");
    expect(haQuantoTempo("lixo", agora)).toBe("nunca");
    expect(haQuantoTempo(diasAtras(0), agora)).toBe("hoje");
    expect(haQuantoTempo(diasAtras(1), agora)).toBe("ontem");
    expect(haQuantoTempo(diasAtras(5), agora)).toBe("há 5 dias");
    expect(haQuantoTempo(diasAtras(21), agora)).toBe("há 3 semanas");
    expect(haQuantoTempo(diasAtras(120), agora)).toBe("há 4 meses");
  });
});

describe("pendenciasDoPainel", () => {
  const painel = (totais: Partial<PainelDoAdmin["totais"]>, clubes: ClubeNoPainel[]): PainelDoAdmin => ({
    dias: 14,
    totais: {
      usuarios: 30, usuarios_novos: 2, usuarios_ativos_7d: 6, clubes_ativos: 7, clubes_com_atividade_7d: 4,
      membros_ativos: 33, pedidos_pendentes: 0, encontros_proximos: 1, obras: 1024, erros_7d: 0, denuncias_pendentes: 0,
      ...totais,
    },
    eventos_por_dia: [],
    eventos_por_tipo: [],
    clubes,
  });

  it("fica vazia quando está tudo em dia", () => {
    expect(pendenciasDoPainel(painel({}, [clube()]), agora)).toEqual([]);
  });

  it("lista o que pede atenção, com singular e plural, e para onde ir", () => {
    const lista = pendenciasDoPainel(
      painel({ erros_7d: 2, denuncias_pendentes: 1, pedidos_pendentes: 3 }, [
        clube({ ultima_atividade: diasAtras(20) }),
        clube({ id: "c2", ultima_atividade: null }),
        clube({ id: "c3", ultima_atividade: null }),
        clube({ id: "c4", ativo: false, ultima_atividade: null }),
      ]),
      agora,
    );
    expect(lista.map((p) => p.texto)).toEqual([
      "2 erros do app nos últimos 7 dias",
      "1 denúncia ou sugestão sem resposta",
      "3 pedidos de entrada aguardando organizador",
      "1 clube parado há mais de 7 dias",
      "2 clubes ativos sem nenhuma ação registrada",
    ]);
    expect(lista[0].secao).toBe("erros-app");
    expect(lista[3].secao).toBe("clubes");
  });
});

describe("apoio", () => {
  it("traduz eventos conhecidos e mantém os desconhecidos", () => {
    expect(nomeDoEvento("clube_criado")).toBe("Clube criado");
    expect(nomeDoEvento("evento_novo")).toBe("evento_novo");
  });

  it("o pico da série nunca é zero", () => {
    expect(picoDaSerie([])).toBe(1);
    expect(picoDaSerie([{ total: 0 }, { total: 0 }])).toBe(1);
    expect(picoDaSerie([{ total: 3 }, { total: 21 }])).toBe(21);
  });
});
