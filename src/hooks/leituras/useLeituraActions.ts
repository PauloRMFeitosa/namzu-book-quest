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
  /** Status inicial da experiência. Padrão "lendo". */
  status?: "lendo" | "concluido";
  /** Data de início. Padrão: hoje. */
  data_inicio?: string | null;
  /** Data de fim (usada quando status = "concluido"). */
  data_fim?: string | null;
}): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("usuario_leituras")
    .insert({
      usuario_livro_id: opts.usuario_livro_id,
      tipo_origem: opts.tipo_origem ?? "individual",
      clube_id: opts.clube_id ?? null,
      status: opts.status ?? "lendo",
      data_inicio: opts.data_inicio ?? today,
      ...(opts.data_fim !== undefined ? { data_fim: opts.data_fim } : {}),
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
  minutos?: number | null;
}) {
  const { error } = await supabase.from("leitura_progresso").insert({
    leitura_id: opts.leitura_id,
    user_id: opts.user_id,
    paginas_lidas: opts.paginas ?? null,
    percentual_lido: opts.percentual ?? null,
    tempo_leitura_minutos: opts.minutos ?? null,
  });
  if (error) throw error;
}

export async function finalizarLeitura(usuario_leitura_id: string, dataFim?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const data_fim = dataFim || today;
  const { error } = await supabase.functions.invoke("salvar-progresso-leitura", {
    body: {
      usuario_leitura_id,
      percentual: 100,
      data_fim,
    },
  });
  if (error) throw error;
}
