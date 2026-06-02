import { SequenciaLeituraCard } from "./SequenciaLeituraCard";
import { DesafioMesCard } from "./DesafioMesCard";
import { ProximaConquistaCard } from "./ProximaConquistaCard";
import { RankingClubeCard } from "./RankingClubeCard";

export const GamificacaoHome = () => {
  return (
    <section className="flex flex-col gap-3">
      <SequenciaLeituraCard />
      <DesafioMesCard />
      <ProximaConquistaCard />
      <RankingClubeCard />
    </section>
  );
};
