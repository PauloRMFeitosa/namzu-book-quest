import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { gamificacaoService } from "@/services/gamificacao";
import { queryKeys } from "@/constants/queryKeys";

export const useGamificacao = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.gamificacao.perfil(user?.id ?? ""),
    enabled: !!user,
    queryFn: () => gamificacaoService.buscarPerfil(user!.id),
  });
};
