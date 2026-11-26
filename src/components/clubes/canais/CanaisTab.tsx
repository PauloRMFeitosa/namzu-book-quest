import { Hash, Users } from "lucide-react";
import { usePermissoesClube } from "@/hooks/clubes/useClubeGestao";
import { useCanais } from "@/hooks/clubes/useCanais";
import { useCanalUIStore } from "@/stores/canalUIStore";
import { CanalList } from "./CanalList";
import { MensagensView } from "./MensagensView";
import { MembrosOnline } from "./MembrosOnline";

interface Props {
  clubeId: string;
  curadorId: string;
  isMembro: boolean;
}

export const CanaisTab = ({ clubeId, curadorId, isMembro }: Props) => {
  // Criar canal: organizador, co-curador e admin.
  const { podeGerir: isCurador } = usePermissoesClube(clubeId, curadorId);
  const { data: canais } = useCanais(clubeId);
  const selecionado = useCanalUIStore((s) => s.canalSelecionado[clubeId] ?? null);
  const setSelecionado = useCanalUIStore((s) => s.setCanalSelecionado);

  const canalAtivo = canais?.find((c) => c.id === selecionado) ?? null;

  if (!isMembro) {
    return (
      <div className="card-soft p-8 text-center border border-dashed border-border/60">
        <Hash className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
        <h3 className="font-display text-lg font-semibold mb-1">Canais do clube</h3>
        <p className="text-sm text-muted-foreground">
          Entre no clube para conversar nos canais.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card-soft overflow-hidden border border-border/60 h-[70vh] min-h-[480px]">
        {canalAtivo ? (
          <MensagensView
            clubeId={clubeId}
            canal={canalAtivo}
            isMembro={isMembro}
            onVoltar={() => setSelecionado(clubeId, null)}
          />
        ) : (
          <CanalList
            clubeId={clubeId}
            isCurador={isCurador}
            selecionado={selecionado}
            onSelecionar={(id) => setSelecionado(clubeId, id)}
          />
        )}
      </div>
      <section className="card-soft p-4 flex flex-col gap-2" aria-label="Quem está online">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Quem está online
        </h3>
        <div className="max-h-64 overflow-y-auto">
          <MembrosOnline clubeId={clubeId} />
        </div>
      </section>
    </div>
  );
};
