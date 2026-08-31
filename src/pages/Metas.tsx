import { PageHero } from "@/components/PageHero";
import { Trophy } from "lucide-react";
import { DesafioMesCard } from "@/components/gamificacao/DesafioMesCard";
import { MissoesDiariasCard } from "@/components/gamificacao/MissoesDiariasCard";
import { SequenciaLeituraCard } from "@/components/gamificacao/SequenciaLeituraCard";
import { ProximaConquistaCard } from "@/components/gamificacao/ProximaConquistaCard";
import { MetaDiariaCard } from "@/components/gamificacao/MetaDiariaCard";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const Metas = () => {
  const { flags } = useFeatureFlags();
  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={Trophy}
        badge="Desafios"
        title={<>Suas <span className="text-gradient-warm">metas</span></>}
        description="Meta diária, desafio do mês, missões e próximas conquistas."
      />
      {flags.show_meta_diaria && <MetaDiariaCard />}
      <SequenciaLeituraCard />
      <DesafioMesCard />
      <MissoesDiariasCard />
      <ProximaConquistaCard />
    </div>
  );
};

export default Metas;
