import { useState } from "react";
import { BookOpen, Check, Play, Sparkles, Plus, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
}

export const LeituraExperienciaCard = ({ usuarioLeituraId }: Props) => {
  const qc = useQueryClient();
  const { data: livro, isLoading } = useLivroDetalhe(usuarioLeituraId);
  const [openConcluir, setOpenConcluir] = useState(false);
  const [showPreForm, setShowPreForm] = useState(false);

  if (isLoading) return <div className="card-soft p-4 text-sm text-muted-foreground">Carregando…</div>;
  if (!livro) return null;

  const preLeitura = livro.leituras.find((l) => l.tipo === "pre_leitura");
  const hasPre = !!preLeitura?.leitura_pre;
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

      {/* Pré-leitura */}
      {hasPre ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="pre" className="card-soft border-none px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Pré-leitura
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <PreLeituraView pre={preLeitura!.leitura_pre!} leituraId={preLeitura!.id} usuarioLeituraId={livro.id} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <div className="card-soft px-3 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Pré-leitura
            </span>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowPreForm((v) => !v)}>
              <Plus className="w-3 h-3" /> {showPreForm ? "Cancelar" : "Adicionar pré-leitura"}
            </Button>
          </div>
          {showPreForm && (
            <PreLeituraForm
              usuarioLeituraId={livro.id}
              onCancel={() => setShowPreForm(false)}
              onSaved={() => setShowPreForm(false)}
            />
          )}
        </div>
      )}

      {/* Sessões de leitura */}
      <div className="flex flex-col gap-2">
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
      </div>

      {/* Pós-leitura */}
      {isLido ? (
        <PosLeituraBlock livro={livro} />
      ) : (
        <div className="card-soft px-3 py-3 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Pós-leitura
          </span>
          <span className="text-xs text-muted-foreground">Conclua a leitura para registrar.</span>
        </div>
      )}

      <ConcluirLeituraDialog open={openConcluir} onOpenChange={setOpenConcluir} onConfirm={concluir} />
    </div>
  );
};
