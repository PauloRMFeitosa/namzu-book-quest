import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/constants/queryKeys";

export interface LigaSemanalEntrada {
  posicao: number;
  user_id: string;
  nome: string;
  avatar_url: string | null;
  xp_na_semana: number;
  isMe: boolean;
}

export interface GamificacaoClube {
  nivel: number;
  xp_total: number;
  xp_proximo_nivel: number;
  liga: LigaSemanalEntrada[];
  minhaPosicao: number | null;
}

/** Início da semana corrente (segunda-feira), no fuso local. */
const inicioSemana = (): string => {
  const hoje = new Date();
  const dia = hoje.getDay(); // 0 = domingo
  const diff = dia === 0 ? 6 : dia - 1;
  const seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diff);
  return seg.toISOString().slice(0, 10);
};

/**
 * Liga semanal e nível do clube (Fase 4 da gamificação).
 * Lê clube_temporadas_ranking (semana corrente) e clube_gamificacao,
 * alimentadas pelo motor unificado conceder_xp/creditar_xp_clube.
 */
export const useGamificacaoClube = (clubeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.gamificacao.clube(clubeId ?? ""), user?.id],
    enabled: !!clubeId && !!user,
    queryFn: async (): Promise<GamificacaoClube | null> => {
      const [clubeRes, ligaRes] = await Promise.all([
        supabase
          .from("clube_gamificacao")
          .select("nivel, xp_total, xp_proximo_nivel")
          .eq("clube_id", clubeId!)
          .maybeSingle(),
        supabase
          .from("clube_temporadas_ranking")
          .select("user_id, xp_na_semana")
          .eq("clube_id", clubeId!)
          .eq("semana_inicio", inicioSemana())
          .order("xp_na_semana", { ascending: false })
          .limit(20),
      ]);

      const entradas = ligaRes.data ?? [];
      const ids = entradas.map((e) => e.user_id);
      let nomes = new Map<string, { nome: string; avatar_url: string | null }>();
      if (ids.length) {
        const { data: perfis } = await supabase
          .from("perfis")
          .select("user_id, nome_exibicao, avatar_url")
          .in("user_id", ids);
        nomes = new Map(
          (perfis ?? []).map((p) => [
            p.user_id,
            { nome: p.nome_exibicao ?? "Leitor", avatar_url: p.avatar_url ?? null },
          ]),
        );
      }

      const liga: LigaSemanalEntrada[] = entradas.map((e, i) => ({
        posicao: i + 1,
        user_id: e.user_id,
        nome: nomes.get(e.user_id)?.nome ?? "Leitor",
        avatar_url: nomes.get(e.user_id)?.avatar_url ?? null,
        xp_na_semana: e.xp_na_semana,
        isMe: e.user_id === user!.id,
      }));
      const minha = liga.find((e) => e.isMe);

      return {
        nivel: clubeRes.data?.nivel ?? 1,
        xp_total: clubeRes.data?.xp_total ?? 0,
        xp_proximo_nivel: clubeRes.data?.xp_proximo_nivel ?? 500,
        liga,
        minhaPosicao: minha?.posicao ?? null,
      };
    },
  });
};
