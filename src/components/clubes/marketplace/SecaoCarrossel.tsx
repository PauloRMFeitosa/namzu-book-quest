import { ReactNode } from "react";
import { ClubeCard } from "./ClubeCard";
import type { ClubeCardData } from "@/hooks/clubes/useClubes";

interface Props {
  titulo: string;
  legenda?: string;
  clubes: ClubeCardData[];
  emptyText?: string;
  rightSlot?: ReactNode;
}

export const SecaoCarrossel = ({ titulo, legenda, clubes, emptyText, rightSlot }: Props) => {
  if (!clubes.length && !emptyText) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{titulo}</h2>
          {legenda && <p className="text-xs text-muted-foreground mt-0.5">{legenda}</p>}
        </div>
        {rightSlot}
      </div>

      {clubes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-2xl">
          {emptyText}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-2">
          {clubes.map((c) => (
            <ClubeCard key={c.id} clube={c} variant="carousel" />
          ))}
        </div>
      )}
    </section>
  );
};
