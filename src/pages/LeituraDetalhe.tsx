import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Play } from "lucide-react";
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

const LeituraDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: livro, isLoading } = useLivroDetalhe(id);
  const [openConcluir, setOpenConcluir] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!livro) return <p className="text-muted-foreground">Leitura não encontrada.</p>;

  const preLeitura = livro.leituras.find((l) => l.tipo === "pre_leitura");
  const progresso = calcularProgresso(livro);
  const isLido = livro.status === "concluido";

  const reabrir = async () => {
    const { error } = await supabase.from("usuario_leituras").update({ status: "lendo", data_fim: null }).eq("id", livro.id);
    if (error) return toast.error(error.message);
    toast.success("Leitura retomada");
    qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
  };

  const concluir = async () => {
    try {
      await finalizarLeitura(livro.id);
      toast.success("Leitura concluída!");
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate(-1)} className="self-start flex items-center gap-1 text-muted-foreground -ml-2 p-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex gap-4">
        {livro.obras?.capa_padrao_url || livro.edicoes?.capa_url ? (
          <img src={livro.edicoes?.capa_url || livro.obras.capa_padrao_url} alt="" className="w-28 h-40 rounded-xl object-cover shadow-elevated" />
        ) : (
          <div className="w-28 h-40 rounded-xl bg-secondary flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary" /></div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h1 className="text-xl font-bold leading-tight">{livro.obras?.titulo_original}</h1>
          {livro.obras?.ano_primeira_publicacao && <p className="text-sm text-muted-foreground">{livro.obras.ano_primeira_publicacao}</p>}
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">{livro.status.replace("_", " ")}</p>
          <ProgressoBar {...progresso} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {isLido ? (
          <Button onClick={reabrir} variant="outline" className="h-11 rounded-2xl border-2">
            <Play className="w-4 h-4" /> Retomar
          </Button>
        ) : (
          <Button onClick={concluir} variant="outline" className="h-11 rounded-2xl border-2">
            <Check className="w-4 h-4" /> Concluir
          </Button>
        )}
        <LeituraCopilotoButton usuarioLeituraId={livro.id} />
      </div>

      {/* Bloco A: Pré-leitura */}
      {preLeitura?.leitura_pre ? (
        <PreLeituraView pre={preLeitura.leitura_pre} leituraId={preLeitura.id} usuarioLeituraId={livro.id} />
      ) : (
        <PreLeituraForm usuarioLeituraId={livro.id} />
      )}

      {/* Bloco B: Leituras */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Sessões de leitura</h3>
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

      {/* Bloco C: Pós-leitura */}
      {isLido && <PosLeituraBlock livro={livro} />}
    </div>
  );
};

export default LeituraDetalhe;
