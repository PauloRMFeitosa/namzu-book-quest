// Prévia da página pública do clube para quem cola o link no WhatsApp e em
// outras redes (docs/pagina-publica.md).
//
// O app é montado no navegador, então o robô que busca a prévia só veria o
// título genérico do NAMZU. O `vercel.json` manda para esta função os pedidos
// desses robôs a /c/<endereco> e a <endereco>.namzu.com.br, e ela responde
// uma página pequena com o nome, a descrição e a capa do clube.
//
// A função não importa nada do app de propósito: assim ela não depende de
// como o Vercel empacota os arquivos de `src/`.

const RAIZ = "namzu.com.br";
const IMAGEM_PADRAO =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a73216d7-d2cc-4d59-a20d-0b0aec871607";
const FORMATO_DO_ENDERECO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ClubeDaPrevia {
  nome: string;
  descricao: string | null;
  imagem_capa_url: string | null;
  membros?: number;
  organizador?: { nome: string | null } | null;
  livro_atual?: { titulo: string; capa_url: string | null } | null;
}

export const escaparHtml = (texto: string) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Endereço pedido, já limpo. Null quando não tem o formato de um endereço de clube. */
export function enderecoPedido(url: URL): string | null {
  const endereco = (url.searchParams.get("endereco") ?? "").trim().toLowerCase();
  return endereco.length >= 3 && endereco.length <= 40 && FORMATO_DO_ENDERECO.test(endereco) ? endereco : null;
}

/** Descrição curta da prévia: a do clube, ou uma frase montada com o livro e o organizador. */
export function descricaoDaPrevia(clube: ClubeDaPrevia): string {
  const descricao = (clube.descricao ?? "").replace(/\s+/g, " ").trim();
  if (descricao) return descricao.length > 200 ? `${descricao.slice(0, 197).trimEnd()}...` : descricao;
  const partes = ["Clube de leitura no NAMZU."];
  if (clube.livro_atual?.titulo) partes.push(`Lendo agora: ${clube.livro_atual.titulo}.`);
  if (clube.organizador?.nome) partes.push(`Organizado por ${clube.organizador.nome}.`);
  return partes.join(" ");
}

/** Só aceita imagem em https, que é o que as redes mostram. */
const imagemSegura = (url: string | null | undefined) => (url && /^https:\/\//i.test(url) ? url : null);

/** Página da prévia. Sem clube, sai a prévia genérica do NAMZU. */
export function htmlDaPrevia(clube: ClubeDaPrevia | null, endereco: string | null): string {
  const url = clube && endereco ? `https://${RAIZ}/c/${endereco}` : `https://${RAIZ}/`;
  const titulo = clube ? `${clube.nome} · Clube de leitura` : "NAMZU · Clubes de leitura";
  const descricao = clube ? descricaoDaPrevia(clube) : "Organize o seu clube de leitura: livros, encontros e conversas em um só lugar.";
  const capa = clube ? imagemSegura(clube.imagem_capa_url) : null;
  const imagem = capa ?? (clube ? imagemSegura(clube.livro_atual?.capa_url) : null) ?? IMAGEM_PADRAO;
  // Quem não é robô e cair aqui vai para o app. O parâmetro tira o pedido desta função.
  const paraOApp = `${url}${url.includes("?") ? "&" : "?"}app=1`;
  const e = escaparHtml;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<meta name="description" content="${e(descricao)}">
<link rel="canonical" href="${e(url)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="NAMZU">
<meta property="og:url" content="${e(url)}">
<meta property="og:title" content="${e(titulo)}">
<meta property="og:description" content="${e(descricao)}">
<meta property="og:image" content="${e(imagem)}">
<meta name="twitter:card" content="${capa ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${e(titulo)}">
<meta name="twitter:description" content="${e(descricao)}">
<meta name="twitter:image" content="${e(imagem)}">
</head>
<body>
<h1>${e(titulo)}</h1>
<p>${e(descricao)}</p>
<p><a href="${e(paraOApp)}">Abrir a página do clube</a></p>
<script>location.replace(${JSON.stringify(paraOApp).replace(/</g, "\\u003c")});</script>
</body>
</html>`;
}

type Buscar = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

/** Lê a página pública do clube no Supabase, com a chave pública. Null se não existe ou está desligada. */
export async function buscarClube(
  endereco: string,
  ambiente: { url?: string; chave?: string },
  buscar: Buscar,
): Promise<ClubeDaPrevia | null> {
  if (!ambiente.url || !ambiente.chave) return null;
  const resposta = await buscar(`${ambiente.url}/rest/v1/rpc/clube_pagina_publica`, {
    method: "POST",
    headers: { apikey: ambiente.chave, Authorization: `Bearer ${ambiente.chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_endereco: endereco }),
  });
  if (!resposta.ok) return null;
  const dados = (await resposta.json()) as ClubeDaPrevia | null;
  return dados && typeof dados === "object" && typeof dados.nome === "string" ? dados : null;
}

export async function responder(
  pedido: Request,
  ambiente: { url?: string; chave?: string },
  buscar: Buscar,
): Promise<Response> {
  const endereco = enderecoPedido(new URL(pedido.url));
  let clube: ClubeDaPrevia | null = null;
  try {
    if (endereco) clube = await buscarClube(endereco, ambiente, buscar);
  } catch {
    clube = null; // sem resposta do banco, sai a prévia genérica
  }
  return new Response(htmlDaPrevia(clube, endereco), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Clube que mudou de capa ou de descrição aparece atualizado em poucos minutos.
      "Cache-Control": clube ? "public, s-maxage=300, stale-while-revalidate=600" : "public, s-maxage=60",
    },
  });
}

export default {
  fetch(pedido: Request) {
    const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;
    return responder(
      pedido,
      { url: env.VITE_SUPABASE_URL ?? env.SUPABASE_URL, chave: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY },
      (url, init) => fetch(url, init),
    );
  },
};
