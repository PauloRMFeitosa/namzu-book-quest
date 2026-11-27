import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import type { DadosDoPlano, OrganizadorComPlano, Plano } from "@/lib/planos";

/** Todos os planos, inclusive os arquivados (Admin > Planos). */
export const usePlanos = () =>
  useQuery({
    queryKey: queryKeys.admin.planos,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<Plano[]> => {
      const { data, error } = await supabase.from("planos").select("*").order("ordem").order("preco_mensal_centavos");
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
  });

/** Organizadores com uso e plano (função `admin_planos_organizadores`, só para admins). */
export const useOrganizadoresComPlano = () =>
  useQuery({
    queryKey: queryKeys.admin.planosOrganizadores,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<OrganizadorComPlano[]> => {
      const { data, error } = await supabase.rpc("admin_planos_organizadores");
      if (error) throw error;
      return (data ?? []) as unknown as OrganizadorComPlano[];
    },
  });

const mensagemDoErro = (erro: { code?: string; message?: string }) =>
  erro?.code === "23505" ? "Já existe um plano com esse identificador." : "Não foi possível salvar. Tente de novo.";

/** Cria (sem `id`) ou altera um plano. */
export const useSalvarPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<DadosDoPlano> }) => {
      const consulta = id
        ? supabase.from("planos").update(dados).eq("id", id)
        : supabase.from("planos").insert(dados as DadosDoPlano);
      const { error } = await consulta;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.planos }),
    onError: (erro) => toast.error(mensagemDoErro(erro as { code?: string })),
  });
};

/** Arquiva ou reativa um plano. Plano arquivado deixa de ser oferecido, mas quem está nele continua. */
export const useArquivarPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, arquivar }: { id: string; arquivar: boolean }) => {
      const dados = arquivar
        ? { arquivado_em: new Date().toISOString(), publicado: false, destaque: false }
        : { arquivado_em: null };
      const { error } = await supabase.from("planos").update(dados).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { arquivar }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.planos });
      toast.success(arquivar ? "Plano arquivado." : "Plano reativado.");
    },
    onError: () => toast.error("Não foi possível alterar o plano."),
  });
};

/** Define o plano de um organizador. `planoId` nulo devolve a pessoa ao plano padrão. */
export const useAtribuirPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, planoId, origem }: { userId: string; planoId: string | null; origem?: string }) => {
      const consulta = planoId
        ? supabase.from("organizador_planos").upsert({ user_id: userId, plano_id: planoId, origem: origem ?? "manual" })
        : supabase.from("organizador_planos").delete().eq("user_id", userId);
      const { error } = await consulta;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.planosOrganizadores });
      toast.success("Plano do organizador atualizado.");
    },
    onError: () => toast.error("Não foi possível trocar o plano."),
  });
};
