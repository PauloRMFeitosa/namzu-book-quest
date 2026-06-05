import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidateLeituras } from "@/lib/queryInvalidation";

export interface ReadingProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Origem da leitura — passe pelo menos um caminho */
  usuarioLeituraId?: string | null;
  obraId?: string | null;
  clubeId?: string | null;

  /** Total de páginas do livro (se conhecido) */
  totalPaginas: number | null;
  /** Última página registrada (já calculada pelo chamador) */
  ultimaPagina: number;

  onSaved?: () => void;
}

/**
 * Modal único de atualização de progresso.
 * Reutilizado por: Página de Leitura, Clubes, Continuar lendo.
 *
 * - O usuário informa apenas a página atual (e o total, se necessário).
 * - Páginas lidas, percentual e sessão são calculados/persistidos automaticamente.
 */
export const ReadingProgressModal = ({
  open,
  onOpenChange,
  usuarioLeituraId,
  obraId,
  clubeId,
  totalPaginas,
  ultimaPagina,
  onSaved,
}: ReadingProgressModalProps) => {
  const qc = useQueryClient();
  const [paginaAtual, setPaginaAtual] = useState<string>("");
  const [totalInput, setTotalInput] = useState<string>("");
  const [tempoMin, setTempoMin] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPaginaAtual(ultimaPagina ? String(ultimaPagina) : "");
      setTotalInput("");
      setTempoMin("");
    }
  }, [open, ultimaPagina]);

  const totalEfetivo = useMemo(() => {
    if (totalPaginas && totalPaginas > 0) return totalPaginas;
    const n = Number(totalInput);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [totalPaginas, totalInput]);

  const pgAtualNum = Number(paginaAtual) || 0;
  const avancou = Math.max(0, pgAtualNum - ultimaPagina);
  const percentual = totalEfetivo ? Math.min(100, Math.round((pgAtualNum / totalEfetivo) * 100)) : null;

  const salvar = async () => {
    if (!pgAtualNum) return toast.error("Informe a página atual");
    if (pgAtualNum < ultimaPagina) {
      return toast.error(`A nova página não pode ser menor que ${ultimaPagina} (última registrada).`);
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        pagina_atual: pgAtualNum,
        percentual: percentual ?? 0,
        registrar_leitura_progresso: true,
      };
      if (usuarioLeituraId) body.usuario_leitura_id = usuarioLeituraId;
      if (obraId) body.obra_id = obraId;
      if (clubeId) body.clube_id = clubeId;
      if (!totalPaginas && totalEfetivo) body.total_paginas = totalEfetivo;
      if (tempoMin) body.tempo_minutos = Number(tempoMin);

      const { error } = await supabase.functions.invoke("salvar-progresso-leitura", { body });
      if (error) throw error;

      toast.success(avancou > 0 ? `+${avancou} páginas registradas` : "Progresso atualizado");
      if (usuarioLeituraId) {
        qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
        qc.invalidateQueries({ queryKey: ["timeline-livro", usuarioLeituraId] });
      }
      if (clubeId) qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
      invalidateLeituras(qc);
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar progresso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar Progresso</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Barra de progresso visual */}
          <div className="flex flex-col gap-1.5">
            <Progress value={percentual ?? 0} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {totalEfetivo ? (
                <>
                  <span>{pgAtualNum} / {totalEfetivo} páginas</span>
                  <span>{percentual ?? 0}%</span>
                </>
              ) : (
                <>
                  <span>Página atual: {pgAtualNum || 0}</span>
                  <span>Total desconhecido</span>
                </>
              )}
            </div>
          </div>

          {/* Página atual */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pagina-atual" className="text-xs">Página atual *</Label>
            <Input
              id="pagina-atual"
              type="number"
              inputMode="numeric"
              min={0}
              max={totalEfetivo ?? undefined}
              value={paginaAtual}
              onChange={(e) => setPaginaAtual(e.target.value)}
              placeholder={totalEfetivo ? `0 a ${totalEfetivo}` : "Ex: 56"}
              className="h-11 rounded-xl"
            />
            {ultimaPagina > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Última página registrada: <strong>{ultimaPagina}</strong>
              </span>
            )}
          </div>

          {/* Total de páginas — apenas quando desconhecido */}
          {!totalPaginas && (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-dashed">
              <Label htmlFor="total-paginas" className="text-xs">Total de páginas</Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Não sabemos quantas páginas este livro possui. Informe para acompanhar seu progresso.
              </p>
              <Input
                id="total-paginas"
                type="number"
                inputMode="numeric"
                min={1}
                value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)}
                placeholder="Ex: 200"
                className="h-10 rounded-xl"
              />
              <span className="text-[11px] text-muted-foreground">Opcional — você pode pular por enquanto.</span>
            </div>
          )}

          {/* Tempo de leitura */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tempo-min" className="text-xs">Tempo de leitura (min, opcional)</Label>
            <Input
              id="tempo-min"
              type="number"
              inputMode="numeric"
              min={0}
              value={tempoMin}
              onChange={(e) => setTempoMin(e.target.value)}
              placeholder="Ex: 30"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Resumo dinâmico */}
          {pgAtualNum > ultimaPagina && (
            <div className="p-3 rounded-xl bg-primary/5 text-sm flex flex-col gap-1">
              <span>Você avançará: <strong>{avancou} páginas</strong></span>
              {totalEfetivo && (
                <span>Novo progresso: <strong>{pgAtualNum} / {totalEfetivo}</strong> · <strong>{percentual}%</strong></span>
              )}
            </div>
          )}

          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
