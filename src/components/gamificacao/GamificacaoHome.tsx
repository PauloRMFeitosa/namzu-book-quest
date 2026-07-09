import { SequenciaLeituraCard } from "./SequenciaLeituraCard";
import { DesafioMesCard } from "./DesafioMesCard";
import { ProximaConquistaCard } from "./ProximaConquistaCard";
import { RankingClubeCard } from "./RankingClubeCard";

export const GamificacaoHome = () => {
  // Mobile: linha única deslizável (swipe card a card, como "Meus clubes ativos").
  // Desktop (md+): grade de três colunas com alturas iguais.
  return (
    <section className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
      <SequenciaLeituraCard />
      <DesafioMesCard />
      <ProximaConquistaCard />
      <RankingClubeCard />
    </section>
  );
};
