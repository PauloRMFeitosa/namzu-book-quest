import { SequenciaLeituraCard } from "./SequenciaLeituraCard";
import { DesafioMesCard } from "./DesafioMesCard";
import { ProximaConquistaCard } from "./ProximaConquistaCard";
import { RankingClubeCard } from "./RankingClubeCard";

export const GamificacaoHome = () => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <SequenciaLeituraCard />
      <DesafioMesCard />
      <ProximaConquistaCard />
      <RankingClubeCard />
    </section>
  );
};
