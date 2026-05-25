import { useState } from "react";
import { BookOpen, Check, Play, Sparkles, Plus, Award, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLivroDetalhe, calcularProgresso } from "@/hooks/leituras/useLivroDetalhe";
import { ProgressoBar } from "@/components/leituras/ProgressoBar";
import { PreLeituraForm } from "@/components/leituras/PreLeituraForm";
import { PreLeituraView } from "@/components/leituras/PreLeituraView";
import { RegistrarLeituraDialog } from "@/components/leituras/RegistrarLeituraDialog";
import { LeiturasList } from "@/components/leituras/LeiturasList";
import { PosLeituraBlock } from "@/components/leituras/PosLeituraBlock";
import { finalizarLeitura } from "@/hooks/leituras/useLeituraActions";
import { ConcluirLeituraDialog } from "@/components/leituras/ConcluirLeituraDialog";
import { supabase } from "@/integrations/supabase/client";
import { LeituraCopilotoButton } from "@/components/clubes/ai/LeituraCopilotoButton";

interface Props {
  usuarioLeituraId: string;
  /** Mostra capa/título do livro no topo do card. Use só no primeiro. */
  showLivroHeader?: boolean;
}

export const LeituraExperienciaCard = ({ usuarioLeituraId, showLivroHeader }: Props) => {
  const qc = useQueryClient();
  const { data: livro, isLoading } = useLivroDetalhe(usuarioLeituraId);
  const [openConcluir, setOpenConcluir] = useState(false);
  const [showPreForm, setShowPreForm] = useState(false);

  if (isLoading) return <div className="card-soft p-4 text-sm text-muted-foreground">Carregando…</div>;
  if (!livro) return null;

  const preLeitura = livro.leituras.find((l) => l.tipo === "pre_leitura");
  const progresso = calcularProgresso(livro);
  const isLido = livro.status === "concluido";

  const dataLabel = livro.data_inicio
    ? new Date(livro.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "Sem data";

  const reabrir = async () => {
    const { error } = await supabase.from("usuario_leituras").update({ status: "lendo", data_fim: null }).eq("id", livro.id);
    if (error) return toast.error(error.message);
    toast.success("Leitura retomada");
    qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
    qc.invalidateQueries({ queryKey: ["livro-experiencias"] });
  };

  const concluir = async (dataFim: string) => {
    try {
      await finalizarLeitura(livro.id, dataFim);
      toast.success("Leitura concluída!");
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["livro-experiencias"] });
      qc.invalidateQueries({ queryKey: ["clube-leituras"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="card-soft p-4 flex flex-col gap-4">
      {showLivroHeader && (
        <div className="flex gap-4">
          {livro.obras?.capa_padrao_url || livro.edicoes?.capa_url ? (
            <img src={livro.edicoes?.capa_url || livro.obras.capa_padrao_url} alt="" className="w-24 h-36 rounded-xl object-cover shadow-elevated" />
          ) : (
            <div className="w-24 h-36 rounded-xl bg-secondary flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary" /></div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
            <h1 className="text-lg font-bold leading-tight">{livro.obras?.titulo_original}</h1>
            {livro.obras?.ano_primeira_publicacao && <p className="text-xs text-muted-foreground">{livro.obras.ano_primeira_publicacao}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leitura</p>
          <p className="text-sm font-semibold">{dataLabel}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
          {livro.status.replace("_", " ")}
        </span>
      </div>

      <ProgressoBar {...progresso} />

      <div className="grid grid-cols-2 gap-2">
        {isLido ? (
          <Button onClick={reabrir} size="sm" variant="outline" className="rounded-xl">
            <Play className="w-3 h-3" /> Retomar
          </Button>
        ) : (
          <Button onClick={() => setOpenConcluir(true)} size="sm" variant="outline" className="rounded-xl">
            <Check className="w-3 h-3" /> Concluir
          </Button>
        )}
        <LeituraCopilotoButton usuarioLeituraId={livro.id} />
      </div>

      <div className="h-px bg-border" />

      {/* Pré-leitura */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" /> Pré-leitura
          </h3>
          {!preLeitura?.leitura_pre && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowPreForm((v) => !v)}
            >
              <Plus className="w-3 h-3" /> {showPreForm ? "Cancelar" : "Adicionar pré-leitura"}
            </Button>
          )}
        </div>
        {preLeitura?.leitura_pre ? (
          <PreLeituraView pre={preLeitura.leitura_pre} leituraId={preLeitura.id} usuarioLeituraId={livro.id} />
        ) : showPreForm ? (
          <PreLeituraForm
            usuarioLeituraId={livro.id}
            onCancel={() => setShowPreForm(false)}
            onSaved={() => setShowPreForm(false)}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Defina sua intenção antes de começar.</p>
        )}
      </section>

      <div className="h-px bg-border" />

      {/* Sessões de leitura */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-primary" /> Sessões de leitura
          </h3>
          <RegistrarLeituraDialog
            usuarioLeituraId={livro.id}
            totalPaginas={livro.edicoes?.num_paginas ?? null}
            disabled={!preLeitura}
          />
        </div>
        {!preLeitura && (
          <p className="text-xs text-muted-foreground">Crie a pré-leitura primeiro para registrar sessões.</p>
        )}
        <LeiturasList leituras={livro.leituras} usuarioLeituraId={livro.id} totalPaginas={livro.edicoes?.num_paginas ?? null} />
      </section>

      <div className="h-px bg-border" />

      {/* Pós-leitura */}
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Award className="w-4 h-4 text-primary" /> Pós-leitura
        </h3>
        {isLido ? (
          <PosLeituraBlock livro={livro} />
        ) : (
          <p className="text-xs text-muted-foreground">Conclua a leitura para registrar a pós-leitura.</p>
        )}
      </section>

      <ConcluirLeituraDialog open={openConcluir} onOpenChange={setOpenConcluir} onConfirm={concluir} />
    </div>
  );
};
