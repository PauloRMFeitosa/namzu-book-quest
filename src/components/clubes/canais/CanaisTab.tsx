import { useEffect } from "react";
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

  // Auto-selecionar primeiro canal
  useEffect(() => {
    if (canais && canais.length && !selecionado) {
      setSelecionado(clubeId, canais[0].id);
    }
  }, [canais, selecionado, clubeId, setSelecionado]);

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
    <div className="card-soft overflow-hidden border border-border/60 grid grid-cols-[180px_1fr] sm:grid-cols-[200px_1fr] h-[70vh] min-h-[480px]">
      <aside className="border-r border-border/60 bg-muted/40">
        <CanalList
          clubeId={clubeId}
          isCurador={isCurador}
          selecionado={selecionado}
          onSelecionar={(id) => setSelecionado(clubeId, id)}
        />
      </aside>
      <section className="min-w-0">
        {canalAtivo ? (
          <MensagensView clubeId={clubeId} canal={canalAtivo} isMembro={isMembro} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {canais?.length ? "Selecione um canal" : "Nenhum canal disponível"}
          </div>
        )}
      </section>
    </div>
  );
};
