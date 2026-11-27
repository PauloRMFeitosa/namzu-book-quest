import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { registrarEvento } from "@/services/analytics";
import type { PaginaPublicaDoClube } from "@/lib/enderecoClube";

// Cast temporário: sai quando os tipos forem regenerados após a migração `clube_pagina_publica`.
const banco = supabase as any;

/** Página pública do clube pelo endereço (função `clube_pagina_publica`, funciona sem login). */
export const usePaginaPublica = (endereco: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.clubes.paginaPublica(endereco ?? ""),
    enabled: !!endereco,
    // Sempre confere ao abrir: se o organizador desligou a página ou mudou o
    // endereço, quem volta ao link não fica vendo a cópia guardada.
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<PaginaPublicaDoClube | null> => {
      const { data, error } = await banco.rpc("clube_pagina_publica", { p_endereco: endereco });
      if (error) throw error;
      return (data as PaginaPublicaDoClube | null) ?? null;
    },
  });

/** Organizador define o endereço e liga ou desliga a página pública. */
export const useDefinirPaginaPublica = (clubeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ endereco, ativa }: { endereco: string; ativa: boolean }) => {
      const { data, error } = await banco.rpc("clube_definir_pagina_publica", {
        p_clube_id: clubeId,
        p_endereco: endereco,
        p_ativa: ativa,
      });
      if (error) throw error;
      return { endereco: data as string | null, ativa };
    },
    onSuccess: ({ endereco, ativa }) => {
      queryClient.invalidateQueries({ queryKey: ["clube", clubeId] });
      if (endereco) queryClient.invalidateQueries({ queryKey: queryKeys.clubes.paginaPublica(endereco) });
      registrarEvento("pagina_publica_definida", { clubeId, props: { ativa } });
      toast.success(ativa ? "Página pública no ar." : "Página pública desligada.");
    },
    // A função do banco já devolve a mensagem em português (endereço em uso, reservado etc.).
    onError: (erro: { message?: string }) => toast.error(erro?.message || "Não foi possível salvar a página pública."),
  });
};
