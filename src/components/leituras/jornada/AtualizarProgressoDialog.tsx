import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { iniciarLeitura, registrarProgresso } from "@/hooks/leituras/useLeituraActions";
import { invalidateLeituras } from "@/lib/queryInvalidation";

interface Props {
  usuarioLeituraId: string;
  paginaAnterior: number;
  totalPaginas: number | null;
}

export const AtualizarProgressoDialog = ({ usuarioLeituraId, paginaAnterior, totalPaginas }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState("");
  const [tempoMin, setTempoMin] = useState("");
  const [loading, setLoading] = useState(false);

  const pgAtualNum = Number(paginaAtual) || 0;
  const paginasLidas = useMemo(
    () => Math.max(0, pgAtualNum - paginaAnterior),
    [pgAtualNum, paginaAnterior],
  );
  const percentual = totalPaginas && totalPaginas > 0
    ? Math.min(100, Math.round((pgAtualNum / totalPaginas) * 100))
    : null;

  const reset = () => {
    setPaginaAtual("");
    setTempoMin("");
  };

  const salvar = async () => {
    if (!pgAtualNum) return toast.error("Informe a página atual");
    if (pgAtualNum <= paginaAnterior) {
      return toast.error(`Página atual deve ser maior que ${paginaAnterior}`);
    }
    setLoading(true);
    try {
      const lid = await iniciarLeitura({
        usuario_leitura_id: usuarioLeituraId,
        tipo: "leitura",
        user_id: user!.id,
      });
      await registrarProgresso({
        leitura_id: lid,
        user_id: user!.id,
        paginas: pgAtualNum,
        percentual,
      });
      toast.success(`+${paginasLidas} páginas registradas`);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", usuarioLeituraId] });
      invalidateLeituras(qc);
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl h-9">
          <Plus className="w-3.5 h-3.5" /> Atualizar progresso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar progresso</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Página anterior</label>
            <Input value={paginaAnterior} readOnly className="h-11 rounded-xl mt-1 bg-muted/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Página atual *</label>
            <Input
              type="number"
              inputMode="numeric"
              value={paginaAtual}
              onChange={(e) => setPaginaAtual(e.target.value)}
              placeholder={totalPaginas ? `até ${totalPaginas}` : "Ex: 45"}
              className="h-11 rounded-xl mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tempo de leitura (min, opcional)</label>
            <Input
              type="number"
              inputMode="numeric"
              value={tempoMin}
              onChange={(e) => setTempoMin(e.target.value)}
              placeholder="Ex: 30"
              className="h-11 rounded-xl mt-1"
            />
          </div>

          {pgAtualNum > paginaAnterior && (
            <div className="p-3 rounded-xl bg-muted/40 text-sm flex flex-col gap-1">
              <span><strong>{paginasLidas}</strong> páginas lidas nesta sessão</span>
              {percentual != null && (
                <span>Progresso total: <strong>{percentual}%</strong></span>
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
