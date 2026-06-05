import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { LivroDetalhe, calcularProgresso } from "@/hooks/leituras/useLivroDetalhe";
import { ProgressoBar } from "@/components/leituras/ProgressoBar";
import { ReadingProgressModal } from "@/components/leituras/ReadingProgressModal";
import { getSessoes } from "@/hooks/leituras/useContainerLeitura";
import { Button } from "@/components/ui/button";

export const ProgressoBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const progresso = calcularProgresso(livro);
  const sessoes = getSessoes(livro);
  const ultima = sessoes[sessoes.length - 1];
  const paginaAtual = progresso.paginasLidas;
  const ultimaData = ultima?.created_at
    ? new Date(ultima.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "Sem registros";
  const [open, setOpen] = useState(false);

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Progresso</h2>
        </div>
        <Button size="sm" className="rounded-xl h-9" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Atualizar progresso
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Página atual</span>
          <span className="text-2xl font-bold leading-none mt-1">
            {paginaAtual}
            {livro.edicoes?.num_paginas && (
              <span className="text-sm text-muted-foreground font-normal"> / {livro.edicoes.num_paginas}</span>
            )}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Última atualização</span>
          <span className="text-sm font-semibold mt-1">{ultimaData}</span>
        </div>
      </div>

      <ProgressoBar {...progresso} />

      <ReadingProgressModal
        open={open}
        onOpenChange={setOpen}
        usuarioLeituraId={livro.id}
        clubeId={livro.clube_id}
        totalPaginas={livro.edicoes?.num_paginas ?? null}
        ultimaPagina={paginaAtual}
      />
    </section>
  );
};
