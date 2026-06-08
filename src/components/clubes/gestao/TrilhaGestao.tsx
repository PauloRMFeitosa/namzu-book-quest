import { useState } from "react";
import { BookOpen, Plus, ArrowUp, ArrowDown, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useTrilhasGestao,
  useRemoverTrilha,
  useReordenarTrilha,
} from "@/hooks/clubes/useClubeTrilhasGestao";
import { AdicionarObraTrilhaDialog } from "./AdicionarObraTrilhaDialog";

export const TrilhaGestao = ({ clubeId }: { clubeId: string }) => {
  const { data: trilhas, isLoading } = useTrilhasGestao(clubeId);
  const remover = useRemoverTrilha(clubeId);
  const reordenar = useReordenarTrilha(clubeId);
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold">Trilha de leituras</h3>
        <Button size="sm" onClick={() => setOpen(true)} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Adicionar obra
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !trilhas?.length ? (
        <div className="card-soft p-6 border border-dashed border-border/60 text-sm text-muted-foreground text-center">
          Nenhuma obra na trilha ainda. Comece adicionando a primeira leitura.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {trilhas.map((t, idx) => {
            const prev = trilhas[idx - 1];
            const next = trilhas[idx + 1];
            return (
              <li key={t.id} className="card-soft p-3 flex items-center gap-3">
                <span className="font-display text-xs font-semibold text-muted-foreground w-6 text-center">
                  {t.ordem}
                </span>
                {t.obra?.capa_padrao_url ? (
                  <img
                    src={t.obra.capa_padrao_url}
                    alt={t.obra.titulo_original}
                    className="w-10 h-14 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {t.obra?.titulo_original ?? "Obra"}
                  </p>
                  {(t.data_inicio_sugerida || t.data_fim_sugerida) && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatRange(t.data_inicio_sugerida, t.data_fim_sugerida)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!prev || reordenar.isPending}
                    onClick={() => prev && reordenar.mutate({ a: t, b: prev })}
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!next || reordenar.isPending}
                    onClick={() => next && reordenar.mutate({ a: t, b: next })}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover obra da trilha?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O progresso dos membros nesta obra não será apagado, mas ela deixará de aparecer na trilha.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remover.mutate(t.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {remover.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Remover"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdicionarObraTrilhaDialog clubeId={clubeId} open={open} onOpenChange={setOpen} />
    </section>
  );
};

const formatRange = (ini: string | null, fim: string | null) => {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  if (ini && fim) return `${fmt(ini)} – ${fmt(fim)}`;
  if (ini) return `A partir de ${fmt(ini)}`;
  if (fim) return `Até ${fmt(fim)}`;
  return "";
};
