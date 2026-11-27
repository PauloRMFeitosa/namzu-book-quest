import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";

// Cast temporário: sai quando os tipos forem regenerados após a migração `clube_grupo`.
const banco = supabase as any;

/** Link do grupo do clube no WhatsApp ou no Telegram. Só quem faz parte do clube consegue ler. */
export const useGrupoDoClube = (clubeId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: queryKeys.clubes.grupo(clubeId ?? ""),
    enabled: !!clubeId && habilitado,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await banco.from("clube_grupos").select("link").eq("clube_id", clubeId).maybeSingle();
      // Antes da migração a tabela não existe: o app segue sem o botão do grupo.
      if (error) return null;
      return (data?.link as string | undefined) ?? null;
    },
  });

/** Organizador guarda o link do grupo. Link vazio apaga. */
export const useSalvarGrupoDoClube = (clubeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (link: string | null) => {
      const consulta = link
        ? banco.from("clube_grupos").upsert({ clube_id: clubeId, link })
        : banco.from("clube_grupos").delete().eq("clube_id", clubeId);
      const { error } = await consulta;
      if (error) throw error;
      return link;
    },
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clubes.grupo(clubeId) });
      registrarEvento("grupo_do_clube_definido", { clubeId, props: { removido: !link } });
      toast.success(link ? "Grupo salvo. Os membros já veem o botão para entrar." : "Link do grupo removido.");
    },
    onError: () => toast.error("Não foi possível salvar o link do grupo."),
  });
};
