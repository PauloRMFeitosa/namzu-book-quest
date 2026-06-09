import { PageHero } from "@/components/PageHero";
import { Trophy } from "lucide-react";
import { DesafioMesCard } from "@/components/gamificacao/DesafioMesCard";
import { MissoesDiariasCard } from "@/components/gamificacao/MissoesDiariasCard";
import { SequenciaLeituraCard } from "@/components/gamificacao/SequenciaLeituraCard";
import { ProximaConquistaCard } from "@/components/gamificacao/ProximaConquistaCard";

const Metas = () => {
  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={Trophy}
        badge="Desafios"
        title={<>Suas <span className="text-gradient-warm">metas</span></>}
        description="Desafio do mês, missões diárias e próximas conquistas."
      />
      <SequenciaLeituraCard />
      <DesafioMesCard />
      <MissoesDiariasCard />
      <ProximaConquistaCard />
    </div>
  );
};

export default Metas;
