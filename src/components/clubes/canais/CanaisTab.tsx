import { Hash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCanais } from "@/hooks/clubes/useCanais";
import { useCanalUIStore } from "@/stores/canalUIStore";
import { CanalList } from "./CanalList";
import { MensagensView } from "./MensagensView";

interface Props {
  clubeId: string;
  curadorId: string;
  isMembro: boolean;
}

export const CanaisTab = ({ clubeId, curadorId, isMembro }: Props) => {
  const { user } = useAuth();
  const isCurador = !!user && user.id === curadorId;
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
  );
};
