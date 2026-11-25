import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMetasClube, usePaginasDasObras, useSalvarCronograma } from "@/hooks/clubes/useCronograma";
import {
  MAXIMO_METAS,
  dividirEmSemanas,
  hojeComoDia,
  lerAlvo,
  ordenarMetas,
  somarDias,
  textoDoAlvo,
  validarCronograma,
  type MetaRascunho,
} from "@/lib/cronograma";

export interface LivroDoCronograma {
  trilhaId: string;
  obraId: string;
  titulo: string;
  dataInicio: string | null;
  dataFim: string | null;
}

interface Props {
  clubeId: string;
  livro: LivroDoCronograma;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}

/** Linha em edição: o alvo fica como texto para o campo poder ficar vazio. */
interface LinhaMeta {
  chave: string;
  id?: string;
  titulo: string;
  alvo: string;
  data_limite: string;
}

interface Estado {
  inicio: string;
  fim: string;
  metas: LinhaMeta[];
  origem: "semanas" | "manual";
}

const draftKey = (trilhaId: string) => `draft-cronograma-${trilhaId}`;

let contador = 0;
const novaChave = () => `nova-${Date.now()}-${contador++}`;

const paraLinha = (m: MetaRascunho): LinhaMeta => ({
  chave: m.id ?? novaChave(),
  id: m.id,
  titulo: m.titulo,
  alvo: m.percentual_alvo === null ? "" : String(m.percentual_alvo),
  data_limite: m.data_limite,
});

const paraRascunho = (l: LinhaMeta): MetaRascunho => ({
  ...(l.id ? { id: l.id } : {}),
  titulo: l.titulo,
  percentual_alvo: lerAlvo(l.alvo),
  data_limite: l.data_limite,
});

/** O que importa para saber se algo mudou em relação ao que está salvo. */
const assinatura = (e: Estado) =>
  JSON.stringify({ inicio: e.inicio, fim: e.fim, metas: e.metas.map(paraRascunho) });

// Organizador define as datas do livro e as metas de leitura (Fase 3).
export const CronogramaDialog = ({ clubeId, livro, open, onOpenChange }: Props) => {
  const { data: metasDoClube, isFetching } = useMetasClube(clubeId, open);
  const { data: paginas } = usePaginasDasObras(open ? [livro.obraId] : []);
  const salvar = useSalvarCronograma(clubeId);
  const totalPaginas = paginas?.[livro.obraId] ?? null;

  const salvo = useMemo<Estado>(
    () => ({
      inicio: livro.dataInicio ?? "",
      fim: livro.dataFim ?? "",
      metas: (metasDoClube ?? []).filter((m) => m.trilha_id === livro.trilhaId).map(paraLinha),
      origem: "manual",
    }),
    [livro.dataInicio, livro.dataFim, livro.trilhaId, metasDoClube],
  );

  const [estado, setEstado] = useState<Estado>(salvo);
  const [pronto, setPronto] = useState(false);
  const [restaurado, setRestaurado] = useState(false);

  // Ao abrir: retoma o rascunho, se houver; senão parte do que está salvo.
  useEffect(() => {
    if (!open) {
      setPronto(false);
      setRestaurado(false);
      return;
    }
    // Espera a busca terminar para não comparar o rascunho com dados velhos.
    if (pronto || isFetching) return;
    const raw = localStorage.getItem(draftKey(livro.trilhaId));
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (Array.isArray(d.metas)) {
          setEstado({
            inicio: typeof d.inicio === "string" ? d.inicio : "",
            fim: typeof d.fim === "string" ? d.fim : "",
            metas: d.metas.map((m: LinhaMeta) => ({ ...m, chave: m.chave ?? novaChave() })),
            origem: d.origem === "semanas" ? "semanas" : "manual",
          });
          setRestaurado(true);
          setPronto(true);
          return;
        }
      } catch {
        // rascunho ilegível: segue com o que está salvo
      }
    }
    setEstado(salvo);
    setPronto(true);
  }, [open, pronto, isFetching, livro.trilhaId, salvo]);

  const alterado = pronto && assinatura(estado) !== assinatura(salvo);

  // Guarda o rascunho só enquanto há algo diferente do que está salvo.
  useEffect(() => {
    if (!open || !pronto) return;
    if (alterado) localStorage.setItem(draftKey(livro.trilhaId), JSON.stringify(estado));
    else localStorage.removeItem(draftKey(livro.trilhaId));
  }, [open, pronto, alterado, estado, livro.trilhaId]);

  const mudar = (parcial: Partial<Estado>) => setEstado((e) => ({ ...e, ...parcial }));
  const mudarMeta = (chave: string, parcial: Partial<LinhaMeta>) =>
    setEstado((e) => ({ ...e, metas: e.metas.map((m) => (m.chave === chave ? { ...m, ...parcial } : m)) }));

  const podeDividir = !!estado.inicio && !!estado.fim && estado.fim >= estado.inicio;

  const dividir = () => {
    const semanas = dividirEmSemanas(estado.inicio, estado.fim);
    if (!semanas.length) {
      toast.error("Não deu para dividir esse período em semanas. Confira as datas.");
      return;
    }
    mudar({ metas: semanas.map(paraLinha), origem: "semanas" });
    toast.success(
      semanas.length === 1 ? "1 meta criada. Ajuste o nome se quiser." : `${semanas.length} metas criadas. Ajuste os nomes se quiser.`,
    );
  };

  const adicionar = () => {
    const ultima = ordenarMetas(estado.metas).at(-1);
    const data = ultima?.data_limite ? somarDias(ultima.data_limite, 7) : estado.fim || somarDias(hojeComoDia(), 7);
    mudar({
      metas: [...estado.metas, { chave: novaChave(), titulo: `Meta ${estado.metas.length + 1}`, alvo: "", data_limite: data }],
    });
  };

  const descartar = () => {
    localStorage.removeItem(draftKey(livro.trilhaId));
    setEstado(salvo);
    setRestaurado(false);
  };

  const enviar = async () => {
    const metas = ordenarMetas(estado.metas.map(paraRascunho));
    const problema = validarCronograma(estado.inicio, estado.fim, metas);
    if (problema) {
      toast.error(problema);
      return;
    }
    try {
      await salvar.mutateAsync({
        trilhaId: livro.trilhaId,
        inicio: estado.inicio,
        fim: estado.fim,
        metas,
        origem: estado.origem,
      });
    } catch {
      return; // o hook já mostrou o erro; o rascunho fica guardado
    }
    localStorage.removeItem(draftKey(livro.trilhaId));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Cronograma de leitura</DialogTitle>
          <DialogDescription>
            {livro.titulo}. Divida o livro em metas com data. Os membros veem a meta atual e recebem um aviso no app
            quando o prazo está chegando.
          </DialogDescription>
        </DialogHeader>

        {!pronto ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {restaurado && alterado && (
              <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">
                Retomamos as alterações que você não tinha salvado.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cronograma-inicio" className="text-xs">
                  Início do livro
                </Label>
                <Input
                  id="cronograma-inicio"
                  type="date"
                  value={estado.inicio}
                  onChange={(e) => mudar({ inicio: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cronograma-fim" className="text-xs">
                  Fim do livro
                </Label>
                <Input
                  id="cronograma-fim"
                  type="date"
                  value={estado.fim}
                  min={estado.inicio || undefined}
                  onChange={(e) => mudar({ fim: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl gap-2 self-start"
                disabled={!podeDividir}
                onClick={dividir}
              >
                <CalendarRange className="w-4 h-4" />
                {estado.metas.length ? "Refazer em semanas" : "Dividir em semanas"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {podeDividir
                  ? estado.metas.length
                    ? "Troca as metas abaixo por uma meta para cada semana do período."
                    : "Cria uma meta para cada semana do período. Depois é só ajustar."
                  : "Informe o início e o fim do livro para dividir em semanas, ou adicione as metas uma a uma."}
              </p>
            </div>

            {estado.metas.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Metas do cronograma">
                {estado.metas.map((m, i) => {
                  const alvo = lerAlvo(m.alvo);
                  return (
                    <li key={m.chave} className="rounded-xl border border-border/70 p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          aria-label={`Nome da meta ${i + 1}`}
                          placeholder="Ex.: Capítulos 1 a 3"
                          maxLength={80}
                          value={m.titulo}
                          onChange={(e) => mudarMeta(m.chave, { titulo: e.target.value })}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          aria-label={`Remover meta ${i + 1}`}
                          onClick={() => mudar({ metas: estado.metas.filter((x) => x.chave !== m.chave) })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-[1fr_7rem] gap-2">
                        <div className="grid gap-1">
                          <Label htmlFor={`meta-data-${m.chave}`} className="text-[11px] text-muted-foreground">
                            Ler até o dia
                          </Label>
                          <Input
                            id={`meta-data-${m.chave}`}
                            type="date"
                            value={m.data_limite}
                            onChange={(e) => mudarMeta(m.chave, { data_limite: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`meta-alvo-${m.chave}`} className="text-[11px] text-muted-foreground">
                            % do livro
                          </Label>
                          <Input
                            id={`meta-alvo-${m.chave}`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={100}
                            placeholder="Opcional"
                            value={m.alvo}
                            onChange={(e) => mudarMeta(m.chave, { alvo: e.target.value })}
                          />
                        </div>
                      </div>
                      {alvo !== null && alvo >= 1 && alvo <= 100 && (
                        <p className="text-[11px] text-muted-foreground">Ler {textoDoAlvo(alvo, totalPaginas)}.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl gap-1.5 self-start"
                disabled={estado.metas.length >= MAXIMO_METAS}
                onClick={adicionar}
              >
                <Plus className="w-4 h-4" /> Adicionar meta
              </Button>
              {alterado && (
                <Button type="button" variant="ghost" className="rounded-xl text-muted-foreground" onClick={descartar}>
                  Descartar alterações
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Com o % do livro preenchido, você vê quem já alcançou a meta e o aviso vai só para quem está abaixo dela.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!pronto || salvar.isPending || !alterado}>
            {salvar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar cronograma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
