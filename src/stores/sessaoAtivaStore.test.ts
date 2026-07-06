import { describe, it, expect, beforeEach, vi } from "vitest";

const CHAVE_SESSAO = "namzu-sessao-leitura-ativa";

const dadosBase = {
  leituraId: "leitura-1",
  usuarioLeituraId: "ul-1",
  clubeId: null,
  titulo: "Livro Teste",
  autor: null,
  capaUrl: null,
  totalPaginas: 100,
  paginasAnteriores: 10,
};

// O store lê o localStorage no momento do import, então cada teste
// recarrega o módulo para simular um "app aberto do zero"
async function carregarStore() {
  vi.resetModules();
  const mod = await import("./sessaoAtivaStore");
  return mod.useSessaoAtiva;
}

describe("sessaoAtivaStore — persistência e recuperação", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persiste a sessão no localStorage ao iniciar", async () => {
    const store = await carregarStore();
    store.getState().iniciar(dadosBase);

    const raw = localStorage.getItem(CHAVE_SESSAO);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).sessao.leituraId).toBe("leitura-1");
  });

  it("restaura sessão persistida como recuperada e reabre o modal", async () => {
    const agora = Date.now();
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        sessao: { ...dadosBase, inicioMs: agora - 10 * 60000, pausadoMs: 0, pausadoEm: null },
        ultimaVezVisivelMs: agora - 8 * 60000,
      })
    );

    const store = await carregarStore();
    const estado = store.getState();

    expect(estado.sessao?.leituraId).toBe("leitura-1");
    expect(estado.recuperada).toBe(true);
    expect(estado.modalAberto).toBe(true);
    expect(estado.tempoForaMs).toBeGreaterThanOrEqual(8 * 60000 - 2000);
  });

  it("desconta o tempo fora do app ao confirmar recuperação com desconto", async () => {
    const agora = Date.now();
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        sessao: { ...dadosBase, inicioMs: agora - 10 * 60000, pausadoMs: 0, pausadoEm: null },
        ultimaVezVisivelMs: agora - 8 * 60000,
      })
    );

    const store = await carregarStore();
    const tempoFora = store.getState().tempoForaMs;
    store.getState().confirmarRecuperacao(true);

    const estado = store.getState();
    expect(estado.sessao?.pausadoMs).toBe(tempoFora);
    expect(estado.recuperada).toBe(false);
    expect(estado.tempoForaMs).toBe(0);
  });

  it("não desconta tempo fora se a sessão estava pausada", async () => {
    const agora = Date.now();
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        sessao: {
          ...dadosBase,
          inicioMs: agora - 10 * 60000,
          pausadoMs: 0,
          pausadoEm: agora - 9 * 60000,
        },
        ultimaVezVisivelMs: agora - 8 * 60000,
      })
    );

    const store = await carregarStore();
    store.getState().confirmarRecuperacao(true);

    expect(store.getState().sessao?.pausadoMs).toBe(0);
  });

  it("limpar remove a sessão persistida", async () => {
    const store = await carregarStore();
    store.getState().iniciar(dadosBase);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeTruthy();

    store.getState().limpar();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
    expect(store.getState().sessao).toBeNull();
  });

  it("mantém pausar/retomar persistidos", async () => {
    const store = await carregarStore();
    store.getState().iniciar(dadosBase);
    store.getState().pausar();

    let persistido = JSON.parse(localStorage.getItem(CHAVE_SESSAO)!);
    expect(persistido.sessao.pausadoEm).not.toBeNull();

    store.getState().retomar();
    persistido = JSON.parse(localStorage.getItem(CHAVE_SESSAO)!);
    expect(persistido.sessao.pausadoEm).toBeNull();
  });

  it("ignora dados corrompidos no localStorage", async () => {
    localStorage.setItem(CHAVE_SESSAO, "{{{não é json");

    const store = await carregarStore();
    const estado = store.getState();

    expect(estado.sessao).toBeNull();
    expect(estado.recuperada).toBe(false);
    expect(estado.modalAberto).toBe(false);
  });
});
