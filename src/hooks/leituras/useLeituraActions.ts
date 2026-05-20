import { supabase } from "@/integrations/supabase/client";

/**
 * Helpers de criação na nova modelagem.
 * Usam INSERTs diretos (com RLS no banco) em vez de RPCs, para casar
 * com o schema atual sem depender de assinatura específica.
 */

export async function criarUsuarioLeitura(opts: {
  usuario_livro_id: string;
  tipo_origem?: "individual" | "clube";
  clube_id?: string | null;
}): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("usuario_leituras")
    .insert({
      usuario_livro_id: opts.usuario_livro_id,
      tipo_origem: opts.tipo_origem ?? "individual",
      clube_id: opts.clube_id ?? null,
      status: "lendo",
      data_inicio: today,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function iniciarLeitura(opts: {
  usuario_leitura_id: string;
  tipo: "pre_leitura" | "leitura" | "pos_leitura";
  user_id: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("leituras")
    .insert({
      user_id: opts.user_id,
      usuario_leitura_id: opts.usuario_leitura_id,
      tipo: opts.tipo,
      data_inicio: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function registrarProgresso(opts: {
  leitura_id: string;
  user_id: string;
  paginas?: number | null;
  percentual?: number | null;
}) {
  const { error } = await supabase.from("leitura_progresso").insert({
    leitura_id: opts.leitura_id,
    user_id: opts.user_id,
    paginas_lidas: opts.paginas ?? null,
    percentual_lido: opts.percentual ?? null,
  });
  if (error) throw error;
}

export async function finalizarLeitura(usuario_leitura_id: string, dataFim?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const data_fim = dataFim || today;
  const { error } = await supabase
    .from("usuario_leituras")
    .update({ status: "concluido", data_fim, updated_at: new Date().toISOString() })
    .eq("id", usuario_leitura_id);
  if (error) throw error;

  // Sincroniza clube_progresso=100 em todos os clubes ativos do usuário
  // que tenham esta obra na trilha.
  try {
    const { data: ul } = await supabase
      .from("usuario_leituras")
      .select("user_id, usuario_livros!inner(obra_id)")
      .eq("id", usuario_leitura_id)
      .maybeSingle();
    const userId = (ul as any)?.user_id as string | undefined;
    const obraId = (ul as any)?.usuario_livros?.obra_id as string | undefined;
    if (userId && obraId) {
      const [{ data: trilhas }, { data: memberships }] = await Promise.all([
        supabase.from("clube_trilhas").select("clube_id").eq("obra_id", obraId),
        supabase
          .from("clube_membros")
          .select("clube_id")
          .eq("user_id", userId)
          .eq("status", "ativo"),
      ]);
      const memberIds = new Set((memberships ?? []).map((m: any) => m.clube_id));
      const clubeIds = Array.from(
        new Set((trilhas ?? []).map((t: any) => t.clube_id).filter((id: string) => memberIds.has(id)))
      );
      if (clubeIds.length) {
        await supabase.from("clube_progresso").upsert(
          clubeIds.map((clube_id) => ({
            user_id: userId,
            clube_id,
            obra_id: obraId,
            percentual: 100,
            status: "concluido",
            data_conclusao: new Date(`${data_fim}T12:00:00`).toISOString(),
          })),
          { onConflict: "user_id,clube_id,obra_id" }
        );
      }
    }
  } catch (e) {
    console.warn("sync clube_progresso (finalizar) falhou", e);
  }
}
