import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Pause, Play, Trash2, Check, BookMarked, Timer } from "lucide-react";
import { useSessaoAtiva } from "@/stores/sessaoAtivaStore";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";

function formatTimer(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTempoFora(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const CHAVE_MANTER_TELA = "namzu-manter-tela-ligada";

type Step = "recuperada" | "ativa" | "finalizar" | "resumo";

type ResumoData = {
  paginasLidas: number;
  segundos: number;
  tempoMinutos: number;
};

export const SessaoLeituraModal = () => {
  const { sessao, modalAberto, recuperada, tempoForaMs, pausar, retomar, confirmarRecuperacao, fecharModal, limpar } =
    useSessaoAtiva();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("ativa");
  const [segundos, setSegundos] = useState(0);
  const [paginaInput, setPaginaInput] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [resumo, setResumo] = useState<ResumoData | null>(null);
  const [manterTela, setManterTela] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_MANTER_TELA) !== "0";
    } catch {
      return true;
    }
  });

  const { suportado: wakeLockSuportado } = useWakeLock(
    !!sessao && sessao.pausadoEm === null && manterTela
  );

  const alterarManterTela = (ligado: boolean) => {
    setManterTela(ligado);
    try {
      localStorage.setItem(CHAVE_MANTER_TELA, ligado ? "1" : "0");
    } catch {}
  };

  const calcSegundos = useCallback(() => {
    if (!sessao) return 0;
    const agora = Date.now();
    const pausadoExtra = sessao.pausadoEm ? agora - sessao.pausadoEm : 0;
    const ativoMs = agora - sessao.inicioMs - sessao.pausadoMs - pausadoExtra;
    return Math.floor(Math.max(0, ativoMs) / 1000);
  }, [sessao]);

  useEffect(() => {
    if (!sessao || (step !== "ativa" && step !== "recuperada")) return;
    const tick = () => setSegundos(calcSegundos());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessao, step, calcSegundos]);

  useEffect(() => {
    if (modalAberto) {
      setStep(useSessaoAtiva.getState().recuperada ? "recuperada" : "ativa");
      setResumo(null);
    }
  }, [modalAberto]);

  useEffect(() => {
    if (sessao && step === "finalizar") {
      setPaginaInput(Math.max(1, sessao.paginasAnteriores + 1));
    }
  }, [step, sessao]);

  if (!sessao) return null;

  const estaRodando = sessao.pausadoEm === null;

  const handleFinalizar = async () => {
    if (!user || !sessao) return;
    setSalvando(true);
    try {
      const dataFim = new Date().toISOString();
      const snapSegundos = calcSegundos();
      const tempoMinutos = Math.max(0, Math.round(snapSegundos / 60));
      const paginasNestaSessao = Math.max(0, paginaInput - sessao.paginasAnteriores);
      const percentual =
        sessao.totalPaginas && sessao.totalPaginas > 0
          ? Math.min(100, Math.round((paginaInput / sessao.totalPaginas) * 100))
          : null;

      // Fecha a sessão com data_fim para registrar a duração nas estatísticas de tempo
      await supabase.from("leituras").update({ data_fim: dataFim }).eq("id", sessao.leituraId);

      // Usa a edge function para salvar o progresso — ela atualiza usuario_leituras,
      // usuario_livros e lida corretamente com o contexto de clube (trilhas)
      const body: Record<string, unknown> = {
        usuario_leitura_id: sessao.usuarioLeituraId,
        pagina_atual: paginaInput,
        percentual: percentual ?? 0,
        registrar_leitura_progresso: true,
        tempo_minutos: tempoMinutos,
      };
      if (sessao.clubeId) body.clube_id = sessao.clubeId;

      const { error } = await supabase.functions.invoke("salvar-progresso-leitura", { body });
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["livro-detalhe", sessao.usuarioLeituraId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["timeline-livro", sessao.usuarioLeituraId], refetchType: "all" });
      if (sessao.clubeId) {
        qc.invalidateQueries({ queryKey: ["clube-leituras", sessao.clubeId], refetchType: "all" });
      }
      invalidateLeituras(qc);

      setResumo({ paginasLidas: paginasNestaSessao, segundos: snapSegundos, tempoMinutos });
      setStep("resumo");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao finalizar sessão");
    } finally {
      setSalvando(false);
    }
  };

  const handleDescartar = async () => {
    if (!sessao) return;
    try {
      await supabase.from("leituras").delete().eq("id", sessao.leituraId);
    } catch {
      // ignora erro ao descartar
    }
    limpar();
    toast.info("Sessão descartada");
  };

  return (
    <Dialog
      open={modalAberto}
      onOpenChange={(o) => {
        if (!o) fecharModal();
      }}
    >
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden [&>button]:hidden">
        {step === "recuperada" && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">Sessão recuperada</h2>
                <p className="text-xs text-muted-foreground">
                  O cronômetro continuou contando enquanto o app esteve fechado.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 flex flex-col items-center gap-1">
              <p className="text-sm font-semibold text-center line-clamp-2">{sessao.titulo}</p>
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {formatTimer(segundos)}
              </span>
              {sessao.pausadoEm !== null ? (
                <p className="text-xs text-muted-foreground">⏸ A sessão estava pausada</p>
              ) : (
                tempoForaMs >= 5 * 60000 && (
                  <p className="text-xs text-muted-foreground">
                    ~{formatTempoFora(tempoForaMs)} com o app fechado
                  </p>
                )
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  confirmarRecuperacao(false);
                  setStep("ativa");
                }}
                className="w-full rounded-2xl bg-primary hover:bg-primary-hover"
              >
                Continuar sessão
              </Button>
              {sessao.pausadoEm === null && tempoForaMs >= 5 * 60000 && (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    confirmarRecuperacao(true);
                    setStep("ativa");
                  }}
                >
                  Continuar descontando {formatTempoFora(tempoForaMs)} fora do app
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl"
                  onClick={() => {
                    confirmarRecuperacao(false);
                    setStep("finalizar");
                  }}
                >
                  Finalizar
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 rounded-2xl text-destructive hover:text-destructive"
                  onClick={handleDescartar}
                >
                  Descartar
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "ativa" && (
          <div className="flex flex-col items-center gap-6 p-6">
            <div className="w-full flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold leading-tight line-clamp-2 text-base">{sessao.titulo}</p>
                {sessao.autor && (
                  <p className="text-xs text-muted-foreground mt-0.5">{sessao.autor}</p>
                )}
              </div>
              <button
                onClick={fecharModal}
                className="shrink-0 text-muted-foreground hover:text-foreground text-2xl leading-none mt-0.5"
              >
                ×
              </button>
            </div>

            <div
              className={cn(
                "w-44 h-44 rounded-full flex flex-col items-center justify-center gap-1.5 transition-colors duration-300",
                estaRodando ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums tracking-tight",
                  estaRodando ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {formatTimer(segundos)}
              </span>
              <span
                className={cn(
                  "text-xs",
                  estaRodando ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {estaRodando ? "📖 Lendo..." : "⏸ Pausado"}
              </span>
            </div>

            {wakeLockSuportado && (
              <label className="flex items-center gap-2 -mt-2 cursor-pointer">
                <Switch checked={manterTela} onCheckedChange={alterarManterTela} />
                <span className="text-xs text-muted-foreground">Manter tela ligada</span>
              </label>
            )}

            <div className="flex gap-8 justify-center">
              <button
                onClick={estaRodando ? pausar : retomar}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                  {estaRodando ? (
                    <Pause className="w-6 h-6 text-foreground" />
                  ) : (
                    <Play className="w-6 h-6 text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {estaRodando ? "Pausar" : "Retomar"}
                </span>
              </button>

              <button
                onClick={() => setStep("finalizar")}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Finalizar</span>
              </button>

              <button
                onClick={handleDescartar}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <span className="text-xs text-destructive">Descartar</span>
              </button>
            </div>
          </div>
        )}

        {step === "finalizar" && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">Finalizar Sessão</h2>
                <p className="text-xs text-muted-foreground">Em qual página você parou?</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-muted/40 rounded-xl p-4">
              <p className="text-xs text-center text-muted-foreground font-medium">Página atual</p>
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={sessao.totalPaginas ?? 99999}
                  value={paginaInput}
                  onChange={(e) => setPaginaInput(Math.max(1, Number(e.target.value)))}
                  className="w-24 text-center text-2xl font-bold bg-background border border-border rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {sessao.totalPaginas && (
                  <span className="text-muted-foreground font-medium text-lg">
                    / {sessao.totalPaginas}
                  </span>
                )}
              </div>
              {sessao.totalPaginas && (
                <Slider
                  min={1}
                  max={sessao.totalPaginas}
                  step={1}
                  value={[paginaInput]}
                  onValueChange={([v]) => setPaginaInput(v)}
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setStep("ativa")}
              >
                Voltar
              </Button>
              <Button
                disabled={salvando}
                onClick={handleFinalizar}
                className="flex-1 rounded-2xl bg-primary hover:bg-primary-hover"
              >
                {salvando ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}

        {step === "resumo" && resumo && (
          <div className="flex flex-col items-center gap-5 p-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BookMarked className="w-8 h-8 text-primary" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold">sessão finalizada!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {resumo.paginasLidas > 0
                  ? `você leu ${resumo.paginasLidas} página${resumo.paginasLidas !== 1 ? "s" : ""} em ${formatTimer(resumo.segundos)}.`
                  : `sessão registrada de ${formatTimer(resumo.segundos)}.`}
              </p>
            </div>

            {resumo.tempoMinutos > 0 && (
              <div className="w-full bg-muted/40 rounded-xl p-4 flex items-center gap-3">
                <span className="text-xl">⏱</span>
                <p className="text-sm font-semibold">
                  +{resumo.tempoMinutos} min registrado{resumo.tempoMinutos !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            <Button
              onClick={limpar}
              className="w-full rounded-2xl bg-primary hover:bg-primary-hover"
            >
              OK
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
