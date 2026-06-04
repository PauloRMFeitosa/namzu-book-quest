import { supabase } from "@/integrations/supabase/client";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";
import type { LivroDetalhe, LeituraFull } from "./useLivroDetalhe";

/**
 * Aprendizados standalone (insights/aplicações/citações/links/tags soltos)
 * são anexados a uma única "leitura container" por usuario_leitura:
 * uma leitura tipo='leitura' que NÃO possui registros em leitura_progresso.
 *
 * Sessões de leitura = leituras tipo='leitura' COM leitura_progresso.
 */
export function getContainerLeitura(livro: LivroDetalhe | null | undefined): LeituraFull | null {
  if (!livro) return null;
  const candidatas = livro.leituras.filter((l) => l.tipo === "leitura");
  // container = primeira leitura tipo='leitura' sem paginas_lidas nem percentual
  return (
    candidatas.find((l) => l.paginas_lidas == null && l.percentual_lido == null) ?? null
  );
}

export function getSessoes(livro: LivroDetalhe | null | undefined): LeituraFull[] {
  if (!livro) return [];
  return livro.leituras
    .filter((l) => l.tipo === "leitura" && (l.paginas_lidas != null || l.percentual_lido != null))
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

export async function ensureContainerLeitura(
  livro: LivroDetalhe,
  userId: string,
): Promise<string> {
  const existing = getContainerLeitura(livro);
  if (existing) return existing.id;
  return await iniciarLeitura({
    usuario_leitura_id: livro.id,
    tipo: "leitura",
    user_id: userId,
  });
}
