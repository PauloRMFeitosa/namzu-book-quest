import { describe, expect, it } from "vitest";
import {
  buscarClube,
  descricaoDaPrevia,
  enderecoPedido,
  escaparHtml,
  htmlDaPrevia,
  responder,
  type ClubeDaPrevia,
} from "../../api/pagina-clube";
import vercel from "../../vercel.json";

// Testes da função do Vercel que responde a prévia do clube (api/pagina-clube.ts)
// e das regras do vercel.json que mandam os robôs para ela.

const clube: ClubeDaPrevia = {
  nome: "Leitoras do Cariri",
  descricao: "Um clube para ler autoras brasileiras.",
  imagem_capa_url: "https://exemplo.com/capa.jpg",
  membros: 32,
  organizador: { nome: "Luciana" },
  livro_atual: { titulo: "Torto Arado", capa_url: "https://exemplo.com/livro.jpg" },
};
const ambiente = { url: "https://banco.exemplo", chave: "chave-publica" };
const respostaDoBanco = (corpo: unknown, ok = true) => async () => ({ ok, json: async () => corpo });

describe("enderecoPedido", () => {
  it("aceita endereço de clube e recusa o resto", () => {
    expect(enderecoPedido(new URL("https://x/api/pagina-clube?endereco=Leitoras-do-Cariri"))).toBe("leitoras-do-cariri");
    expect(enderecoPedido(new URL("https://x/api/pagina-clube"))).toBeNull();
    expect(enderecoPedido(new URL("https://x/api/pagina-clube?endereco=ab"))).toBeNull();
    expect(enderecoPedido(new URL("https://x/api/pagina-clube?endereco=a%20b%3Cscript%3E"))).toBeNull();
    expect(enderecoPedido(new URL("https://x/api/pagina-clube?endereco=../../etc"))).toBeNull();
  });
});

describe("htmlDaPrevia", () => {
  it("traz nome, descrição, capa e endereço do clube", () => {
    const html = htmlDaPrevia(clube, "leitoras-do-cariri");
    expect(html).toContain('<meta property="og:title" content="Leitoras do Cariri · Clube de leitura">');
    expect(html).toContain('<meta property="og:description" content="Um clube para ler autoras brasileiras.">');
    expect(html).toContain('<meta property="og:image" content="https://exemplo.com/capa.jpg">');
    expect(html).toContain('<meta property="og:url" content="https://namzu.com.br/c/leitoras-do-cariri">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("sem capa usa a capa do livro; sem nenhuma, a imagem do NAMZU", () => {
    expect(htmlDaPrevia({ ...clube, imagem_capa_url: null }, "x-y-z")).toContain('og:image" content="https://exemplo.com/livro.jpg"');
    const semImagem = htmlDaPrevia({ ...clube, imagem_capa_url: null, livro_atual: null }, "x-y-z");
    expect(semImagem).toMatch(/og:image" content="https:\/\/storage\.googleapis\.com\//);
    expect(semImagem).toContain('twitter:card" content="summary"');
  });

  it("não aceita imagem fora de https", () => {
    expect(htmlDaPrevia({ ...clube, imagem_capa_url: "javascript:alert(1)", livro_atual: null }, "x-y-z")).not.toContain("javascript:");
    expect(htmlDaPrevia({ ...clube, imagem_capa_url: "data:image/png;base64,AAA", livro_atual: null }, "x-y-z")).not.toContain("data:image");
  });

  it("escapa o que vem do clube", () => {
    const html = htmlDaPrevia({ ...clube, nome: 'Clube "A" <script>alert(1)</script>', descricao: "</title><img src=x onerror=1>" }, "x-y-z");
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(escaparHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("manda quem não é robô para o app, fora desta função", () => {
    const html = htmlDaPrevia(clube, "leitoras-do-cariri");
    expect(html).toContain('location.replace("https://namzu.com.br/c/leitoras-do-cariri?app=1")');
    expect(html).toContain('<a href="https://namzu.com.br/c/leitoras-do-cariri?app=1">');
  });

  it("sem clube, sai a prévia do NAMZU", () => {
    const html = htmlDaPrevia(null, "nao-existe");
    expect(html).toContain('og:title" content="NAMZU · Clubes de leitura"');
    expect(html).toContain('og:url" content="https://namzu.com.br/"');
  });
});

describe("descricaoDaPrevia", () => {
  it("corta descrição longa e monta uma quando não há", () => {
    expect(descricaoDaPrevia({ ...clube, descricao: "x".repeat(400) })).toHaveLength(200);
    expect(descricaoDaPrevia({ ...clube, descricao: "  " })).toBe("Clube de leitura no NAMZU. Lendo agora: Torto Arado. Organizado por Luciana.");
    expect(descricaoDaPrevia({ nome: "X", descricao: null, imagem_capa_url: null })).toBe("Clube de leitura no NAMZU.");
  });
});

describe("buscarClube e responder", () => {
  it("consulta a função pública com a chave pública", async () => {
    const chamadas: { url: string; init: { headers: Record<string, string>; body: string } }[] = [];
    const achado = await buscarClube("leitoras", ambiente, async (url, init) => {
      chamadas.push({ url, init });
      return { ok: true, json: async () => clube };
    });
    expect(achado?.nome).toBe("Leitoras do Cariri");
    expect(chamadas[0].url).toBe("https://banco.exemplo/rest/v1/rpc/clube_pagina_publica");
    expect(chamadas[0].init.headers.apikey).toBe("chave-publica");
    expect(JSON.parse(chamadas[0].init.body)).toEqual({ p_endereco: "leitoras" });
  });

  it("devolve null sem página, com erro ou sem configuração", async () => {
    expect(await buscarClube("leitoras", ambiente, respostaDoBanco(null))).toBeNull();
    expect(await buscarClube("leitoras", ambiente, respostaDoBanco({ message: "erro" }, false))).toBeNull();
    expect(await buscarClube("leitoras", {}, respostaDoBanco(clube))).toBeNull();
  });

  it("responde a prévia do clube, com cache curto", async () => {
    const resposta = await responder(new Request("https://namzu.com.br/api/pagina-clube?endereco=leitoras"), ambiente, respostaDoBanco(clube));
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toMatch(/text\/html/);
    expect(resposta.headers.get("cache-control")).toMatch(/s-maxage=300/);
    expect(await resposta.text()).toContain("Leitoras do Cariri");
  });

  it("banco fora do ar não derruba a prévia", async () => {
    const resposta = await responder(new Request("https://namzu.com.br/api/pagina-clube?endereco=leitoras"), ambiente, async () => {
      throw new Error("sem rede");
    });
    expect(resposta.status).toBe(200);
    expect(await resposta.text()).toContain("NAMZU · Clubes de leitura");
  });

  it("endereço inválido nem consulta o banco", async () => {
    let consultou = false;
    await responder(new Request("https://namzu.com.br/api/pagina-clube?endereco=%3Cx%3E"), ambiente, async () => {
      consultou = true;
      return { ok: true, json: async () => clube };
    });
    expect(consultou).toBe(false);
  });
});

describe("regras do vercel.json", () => {
  type Regra = { source: string; destination: string; has?: { type: string; key?: string; value: string }[]; missing?: { type: string; key: string }[] };
  const regras = vercel.rewrites as Regra[];
  const daPrevia = regras.filter((r) => r.destination.startsWith("/api/pagina-clube"));
  const robo = (r: Regra) => new RegExp(`^${r.has!.find((h) => h.type === "header")!.value}$`);

  it("as regras da prévia vêm antes da regra geral do app", () => {
    const geral = regras.findIndex((r) => r.destination === "/index.html");
    expect(daPrevia).toHaveLength(2);
    for (const r of daPrevia) expect(regras.indexOf(r)).toBeLessThan(geral);
  });

  it("só robôs de prévia caem na função", () => {
    for (const r of daPrevia) {
      expect(r.has?.find((h) => h.type === "header")?.key).toBe("user-agent");
      expect(r.missing).toEqual([{ type: "query", key: "app" }]);
      const re = robo(r);
      expect(re.test("WhatsApp/2.23.20.0")).toBe(true);
      expect(re.test("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
      expect(re.test("TelegramBot (like TwitterBot)")).toBe(true);
      expect(re.test("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36")).toBe(false);
      expect(re.test("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
      expect(re.test("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(false);
    }
  });

  it("o subdomínio vira o endereço do clube, menos o www", () => {
    const porHost = daPrevia.find((r) => r.has?.some((h) => h.type === "host"))!;
    expect(porHost.source).toBe("/");
    expect(porHost.destination).toBe("/api/pagina-clube?endereco=:endereco");
    const re = new RegExp(`^${porHost.has!.find((h) => h.type === "host")!.value}$`);
    expect("leitoras-do-cariri.namzu.com.br".match(re)?.groups?.endereco).toBe("leitoras-do-cariri");
    expect(re.test("www.namzu.com.br")).toBe(false);
    expect(re.test("namzu.com.br")).toBe(false);
    expect(re.test("a.b.namzu.com.br")).toBe(false);
  });
});
