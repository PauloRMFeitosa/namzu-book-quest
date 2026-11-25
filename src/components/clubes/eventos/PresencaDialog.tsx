import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMembrosClube } from "@/hooks/clubes/useMembrosClube";
import { usePresencasEvento, useRespostasEvento, useSalvarPresenca } from "@/hooks/clubes/useEncontros";
import {
  mesmaLista,
  ordenarParaPresenca,
  presencaInicial,
  resumoDaPresenca,
  rotuloDaResposta,
  type PessoaDaPresenca,
} from "@/lib/encontros";

interface Props {
  clubeId: string;
  curadorId: string;
  evento: { id: string; titulo: string; presentes_count: number };
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}

// Organizador marca quem esteve no encontro (Fase 3).
export const PresencaDialog = ({ clubeId, curadorId, evento, open, onOpenChange }: Props) => {
  const membros = useMembrosClube(open ? clubeId : undefined, curadorId);
  const respostas = useRespostasEvento(evento.id, open);
  const gravados = usePresencasEvento(evento.id, open);
  const salvar = useSalvarPresenca(clubeId);

  const pessoas = useMemo<PessoaDaPresenca[]>(
    () =>
      ordenarParaPresenca(
        (membros.data ?? [])
          .filter((m) => m.status === "ativo")
          .map((m) => ({
            user_id: m.user_id,
            nome: m.perfil?.nome_exibicao || m.perfil?.username || "Membro",
            resposta: respostas.data?.[m.user_id] ?? null,
          })),
      ),
    [membros.data, respostas.data],
  );

  const carregando = membros.isFetching || respostas.isFetching || gravados.isFetching;
  const jaFoiGravada = (gravados.data?.length ?? 0) > 0;
  const [marcados, setMarcados] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!open) {
      setPronto(false);
      return;
    }
    if (pronto || carregando) return;
    setMarcados(presencaInicial(pessoas, gravados.data ?? [], jaFoiGravada));
    setPronto(true);
  }, [open, pronto, carregando, pessoas, gravados.data, jaFoiGravada]);

  const alternar = (id: string, marcado: boolean) =>
    setMarcados((atual) => (marcado ? [...new Set([...atual, id])] : atual.filter((x) => x !== id)));

  const mudou = !jaFoiGravada || !mesmaLista(marcados, gravados.data ?? []);

  const enviar = async () => {
    try {
      await salvar.mutateAsync({ eventoId: evento.id, presentes: marcados, membros: pessoas.length });
    } catch {
      return; // o hook já mostrou o erro
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Lista de presença</DialogTitle>
          <DialogDescription>
            {evento.titulo}. Marque quem esteve no encontro.
            {!jaFoiGravada && pronto ? " Quem confirmou já vem marcado." : ""}
          </DialogDescription>
        </DialogHeader>

        {!pronto ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : pessoas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">O clube ainda não tem membros ativos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{resumoDaPresenca(marcados.length, pessoas.length)}</p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl h-8"
                  onClick={() => setMarcados(pessoas.map((p) => p.user_id))}
                >
                  Marcar todos
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-xl h-8" onClick={() => setMarcados([])}>
                  Limpar
                </Button>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-border/50" aria-label="Membros do clube">
              {pessoas.map((p) => {
                const idCampo = `presenca-${evento.id}-${p.user_id}`;
                return (
                  <li key={p.user_id} className="py-2.5 flex items-center gap-3">
                    <Checkbox
                      id={idCampo}
                      checked={marcados.includes(p.user_id)}
                      onCheckedChange={(v) => alternar(p.user_id, v === true)}
                    />
                    <label htmlFor={idCampo} className="flex-1 min-w-0 cursor-pointer">
                      <span className="block text-sm font-medium truncate">{p.nome}</span>
                      <span className="block text-xs text-muted-foreground">{rotuloDaResposta(p.resposta)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!pronto || salvar.isPending || pessoas.length === 0 || !mudou}>
            {salvar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar presença"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
