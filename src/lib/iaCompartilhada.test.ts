import { describe, expect, it, vi } from "vitest";
import {
  chamarIA,
  configuracaoIA,
  ErroIA,
  erroDoProvedor,
  extrairJson,
  montarCorpo,
} from "../../supabase/functions/_shared/ia";

// Testa o módulo de IA das Edge Functions (supabase/functions/_shared/ia.ts),
// que não depende do Deno fora da leitura dos segredos.

const google = configuracaoIA({ GEMINI_API_KEY: "chave-google" });
const esquema = { type: "object", properties: { perguntas: { type: "array", items: { type: "string" } } }, required: ["perguntas"] };
const resposta = (status: number, corpo: unknown) =>
  new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), { status });
const comConteudo = (conteudo: string) => resposta(200, { choices: [{ message: { content: conteudo } }] });

describe("configuracaoIA", () => {
  it("usa o Google quando a chave existe, com os modelos padrão", () => {
    expect(google.provedor).toBe("google");
    expect(google.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(google.modelos).toEqual({ rapido: "gemini-2.5-flash", avancado: "gemini-2.5-pro" });
  });

  it("aceita trocar os modelos pelos segredos", () => {
    const config = configuracaoIA({ GEMINI_API_KEY: "k", GEMINI_MODELO_RAPIDO: " gemini-x-flash ", GEMINI_MODELO_AVANCADO: "gemini-x-pro" });
    expect(config.modelos).toEqual({ rapido: "gemini-x-flash", avancado: "gemini-x-pro" });
  });

  it("sem chave do Google, continua no gateway antigo", () => {
    const config = configuracaoIA({ GEMINI_API_KEY: "  ", LOVABLE_API_KEY: "chave-antiga" });
    expect(config.provedor).toBe("lovable");
    expect(config.modelos.rapido).toBe("google/gemini-2.5-flash");
  });

  it("sem chave nenhuma, avisa que a IA não está configurada", () => {
    expect(() => configuracaoIA({})).toThrow(ErroIA);
  });
});

describe("montarCorpo", () => {
  it("monta a conversa com o modelo do nível pedido", () => {
    const corpo = montarCorpo(google, { nivel: "avancado", system: "s", user: "u" });
    expect(corpo).toEqual({ model: "gemini-2.5-pro", messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }] });
  });

  it("com esquema, pede o formato estruturado", () => {
    const corpo = montarCorpo(google, { nivel: "rapido", system: "s", user: "u", json_schema: esquema });
    expect(corpo.response_format).toEqual({ type: "json_schema", json_schema: { name: "result", strict: true, schema: esquema } });
  });

  it("sem formato, descreve o JSON no próprio texto", () => {
    const corpo = montarCorpo(google, { nivel: "rapido", system: "s", user: "u", json_schema: esquema }, false) as {
      response_format?: unknown;
      messages: { content: string }[];
    };
    expect(corpo.response_format).toBeUndefined();
    expect(corpo.messages[1].content).toContain("Responda somente com um objeto JSON válido");
    expect(corpo.messages[1].content).toContain('"perguntas"');
  });
});

describe("extrairJson", () => {
  it("lê JSON puro, com cerca de código ou com texto em volta", () => {
    expect(extrairJson('{"a":1}')).toEqual({ a: 1 });
    expect(extrairJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extrairJson('Claro! Aqui está: {"a":1} Espero que ajude.')).toEqual({ a: 1 });
  });

  it("devolve nulo quando não há objeto JSON", () => {
    expect(extrairJson("sem json")).toBeNull();
    expect(extrairJson("")).toBeNull();
    expect(extrairJson("42")).toBeNull();
  });
});

describe("erroDoProvedor", () => {
  it("traduz os erros sem expor detalhes", () => {
    expect(erroDoProvedor(429, "google")).toMatchObject({ status: 429, codigo: "rate_limit" });
    expect(erroDoProvedor(402, "lovable")).toMatchObject({ status: 402, codigo: "payment_required" });
    expect(erroDoProvedor(403, "google")).toMatchObject({ status: 500, codigo: "ia_nao_configurada" });
    expect(erroDoProvedor(503, "google")).toMatchObject({ status: 500, codigo: "ai_error" });
    expect(erroDoProvedor(402, "lovable").message).not.toMatch(/Lovable/i);
  });
});

describe("chamarIA", () => {
  it("envia a chave no cabeçalho e devolve o texto", async () => {
    const buscar = vi.fn().mockResolvedValue(comConteudo("Olá, leitoras."));
    const saida = await chamarIA(google, { nivel: "rapido", system: "s", user: "u" }, buscar);
    expect(saida).toEqual({ texto: "Olá, leitoras." });
    const [url, init] = buscar.mock.calls[0];
    expect(url).toBe(google.url);
    expect(init.headers.Authorization).toBe("Bearer chave-google");
    expect(JSON.parse(init.body).model).toBe("gemini-2.5-flash");
  });

  it("com esquema, devolve o objeto lido", async () => {
    const buscar = vi.fn().mockResolvedValue(comConteudo('{"perguntas":["a","b"]}'));
    expect(await chamarIA(google, { nivel: "rapido", system: "s", user: "u", json_schema: esquema }, buscar)).toEqual({ perguntas: ["a", "b"] });
  });

  it("se o formato estruturado for recusado, tenta de novo pedindo JSON pelo texto", async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(resposta(400, "INVALID_ARGUMENT"))
      .mockResolvedValueOnce(comConteudo('```json\n{"perguntas":["a"]}\n```'));
    const saida = await chamarIA(google, { nivel: "rapido", system: "s", user: "u", json_schema: esquema }, buscar);
    expect(saida).toEqual({ perguntas: ["a"] });
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(JSON.parse(buscar.mock.calls[1][1].body).response_format).toBeUndefined();
  });

  it("resposta que não é JSON volta em raw", async () => {
    const buscar = vi.fn().mockResolvedValue(comConteudo("não consegui"));
    expect(await chamarIA(google, { nivel: "rapido", system: "s", user: "u", json_schema: esquema }, buscar)).toEqual({ raw: "não consegui" });
  });

  it("falha do provedor vira ErroIA, sem repetir a tentativa em pedido de texto", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(429, "quota"));
    await expect(chamarIA(google, { nivel: "rapido", system: "s", user: "u" }, buscar)).rejects.toMatchObject({ status: 429, codigo: "rate_limit" });
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});
