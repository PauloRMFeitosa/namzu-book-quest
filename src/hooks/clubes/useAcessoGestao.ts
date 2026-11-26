import { useClube, useClubeMembership } from "@/hooks/clubes/useClube";
import { usePermissoesClube } from "@/hooks/clubes/useClubeGestao";

/**
 * Para as páginas de criação dentro do clube: carrega o clube e diz se quem
 * está logado pode gerir. A página redireciona quando `liberado` é falso,
 * porque a URL é acessível direto, mesmo com o botão escondido.
 */
export const useAcessoGestao = (clubeId: string) => {
  const { data: clube, isLoading: carregandoClube } = useClube(clubeId);
  const { data: participacao, isLoading: carregandoParticipacao } = useClubeMembership(clubeId);
  const { podeGerir } = usePermissoesClube(clubeId, clube?.curador_id);
  const carregando = carregandoClube || carregandoParticipacao;
  return {
    clube,
    carregando,
    /** Organizador, co-curador ou admin. */
    liberado: !!clube && podeGerir,
    /** Qualquer membro ativo, além de quem gere. Para o que todo membro pode criar. */
    liberadoParaMembro: !!clube && (podeGerir || participacao?.status === "ativo"),
  };
};
