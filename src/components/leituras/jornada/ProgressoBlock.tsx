import { useState } from "react";
import { BookOpen, Plus, CheckCircle2, Play } from "lucide-react";
import { LivroDetalhe, calcularProgresso } from "@/hooks/leituras/useLivroDetalhe";
import { ProgressoBar } from "@/components/leituras/ProgressoBar";
import { ReadingProgressModal } from "@/components/leituras/ReadingProgressModal";
import { ConcluirLeituraDialog } from "@/components/leituras/ConcluirLeituraDialog";
import { getSessoes } from "@/hooks/leituras/useContainerLeitura";
import { Button } from "@/components/ui/button";
import { useConcluirLeitura } from "@/hooks/leituras/useConcluirLeitura";
import { useSessaoAtiva } from "@/stores/sessaoAtivaStore";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const ProgressoBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const progresso = calcularProgresso(livro);
  const sessoes = getSessoes(livro);
  const ultima = sessoes[sessoes.length - 1];
  const paginaAtual = progresso.paginasLidas;
  const ultimaData = ultima?.created_at
    ? new Date(ultima.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "Sem registros";
  const [open, setOpen] = useState(false);
  const [openConcluir, setOpenConcluir] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const concluirLeitura = useConcluirLeitura();
  const concluido = livro.status === "concluido";
  const { sessao, abrirModal, iniciar } = useSessaoAtiva();
  const { user } = useAuth();

  const estaNestaLeitura = sessao?.usuarioLeituraId === livro.id;

  const handleLerAgora = async () => {
    if (!user) return;
    if (sessao) {
      abrirModal();
      return;
    }
    setIniciando(true);
    try {
      const leituraId = await iniciarLeitura({
        usuario_leitura_id: livro.id,
        tipo: "leitura",
        user_id: user.id,
      });
      iniciar({
        leituraId,
        usuarioLeituraId: livro.id,
        titulo: livro.obras?.titulo_original ?? "Livro",
        autor: livro.autores?.[0]?.nome ?? null,
        capaUrl: livro.edicoes?.capa_url ?? null,
        totalPaginas: livro.edicoes?.num_paginas ?? null,
        paginasAnteriores: paginaAtual,
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao iniciar sessão");
    } finally {
      setIniciando(false);
    }
  };

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Progresso</h2>
      </div>

      {!concluido && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="rounded-xl h-9" onClick={() => setOpenConcluir(true)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Concluir leitura
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9" onClick={() => setOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Atualizar progresso
            </Button>
            <Button
              size="sm"
              disabled={iniciando}
              onClick={handleLerAgora}
              className="flex-1 rounded-xl h-9 bg-primary hover:bg-primary-hover"
            >
              <Play className="w-3.5 h-3.5" />
              {estaNestaLeitura ? "Retomar sessão" : "Ler agora"}
            </Button>
          </div>
        </div>
      )}

      {concluido && (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Esta leitura já foi concluída.
        </span>
      )}

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

      <ConcluirLeituraDialog
        open={openConcluir}
        onOpenChange={setOpenConcluir}
        onConfirm={async (dataFim) => {
          await concluirLeitura({
            usuarioLeituraId: livro.id,
            clubeId: livro.clube_id,
            totalPaginas: livro.edicoes?.num_paginas ?? null,
            dataFim,
          });
        }}
      />
    </section>
  );
};
