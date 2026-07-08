import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink, CheckCircle2, XCircle, Globe, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type CandidatoObra = {
  qid: string;
  url_wikidata: string;
  titulo: string;
  descricao: string | null;
  ano_publicacao: number | null;
  idioma_original: string | null;
  score: number;
  autor_labels: string[];
};

type AutorWikidata = {
  qid: string;
  nome: string;
  url_wikidata: string;
  autor_conciliado_id: string | null;
  sugestao_autor_id: string | null;
};

type AutorObra = { id: string; nome_completo: string; status_conciliacao: string };

type ObraAtual = {
  id: string;
  titulo_original: string;
  sinopse_padrao: string | null;
  ano_primeira_publicacao: number | null;
  idioma_original: string | null;
};

interface Props {
  obra: { id: string; titulo_original: string };
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

const ScorePill = ({ s }: { s: number }) => {
  const cls =
    s >= 75 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" :
    s >= 60 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20" :
              "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20";
  return (
    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-semibold border shrink-0 ${cls}`}>
      {s}
    </span>
  );
};

export const EnriquecerObraWikidataDialog = ({ obra, open, onClose }: Props) => {
  const [etapa, setEtapa] = useState<"busca" | "candidatos" | "autores">("busca");
  const [obraAtual, setObraAtual] = useState<ObraAtual | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoObra[]>([]);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [obraConciliada, setObraConciliada] = useState(false);

  // Etapa de autores
  const [autoresWikidata, setAutoresWikidata] = useState<AutorWikidata[]>([]);
  const [autoresObra, setAutoresObra] = useState<AutorObra[]>([]);
  const [selecoes, setSelecoes] = useState<Record<string, string>>({});
  const [enriquecidos, setEnriquecidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setEtapa("busca");
    setCandidatos([]);
    setSobrescrever(false);
    setActing(null);
    setObraConciliada(false);
    setAutoresWikidata([]);
    setAutoresObra([]);
    setSelecoes({});
    setEnriquecidos(new Set());

    (async () => {
      try {
        const [{ data: atual }, { data: resultado, error }] = await Promise.all([
          (supabase as any)
            .from("obras")
            .select("id, titulo_original, sinopse_padrao, ano_primeira_publicacao, idioma_original")
            .eq("id", obra.id)
            .maybeSingle(),
          (supabase as any).functions.invoke("reprocessar-obras", {
            body: { obra_id: obra.id },
          }),
        ]);
        if (error) throw error;
        setObraAtual(atual ?? null);
        setCandidatos((resultado?.candidatos ?? []) as CandidatoObra[]);
        setEtapa("candidatos");
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao buscar no Wikidata");
        onClose(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obra.id]);

  const conciliarObra = async (c: CandidatoObra) => {
    setActing(c.qid);
    try {
      const { data, error } = await (supabase as any).functions.invoke("conciliar-obra", {
        body: { obra_id: obra.id, qid: c.qid, sobrescrever },
      });
      if (error) throw error;
      setObraConciliada(true);
      toast.success(`Obra conciliada com ${c.qid}`);

      const aws = (data?.autores_wikidata ?? []) as AutorWikidata[];
      const aos = (data?.autores_obra ?? []) as AutorObra[];
      if (aws.length && aos.length) {
        setAutoresWikidata(aws);
        setAutoresObra(aos);
        const iniciais: Record<string, string> = {};
        for (const aw of aws) {
          if (aw.sugestao_autor_id) iniciais[aw.qid] = aw.sugestao_autor_id;
        }
        setSelecoes(iniciais);
        setEnriquecidos(new Set(aws.filter((a) => a.autor_conciliado_id).map((a) => a.qid)));
        setEtapa("autores");
      } else {
        onClose(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao conciliar obra");
    } finally {
      setActing(null);
    }
  };

  const semCorrespondencia = async () => {
    setActing("sem-corresp");
    try {
      await (supabase as any)
        .from("obras")
        .update({ metadata_score: -1, metadata_checked_at: new Date().toISOString() })
        .eq("id", obra.id);
      await (supabase as any).from("obras_candidatos_wikidata").delete().eq("obra_id", obra.id);
      toast.success("Obra marcada como sem correspondência");
      onClose(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setActing(null);
    }
  };

  const enriquecerAutor = async (aw: AutorWikidata) => {
    const autorId = selecoes[aw.qid];
    if (!autorId) {
      toast.error("Selecione o autor local correspondente");
      return;
    }
    setActing(aw.qid);
    try {
      const { error } = await (supabase as any).functions.invoke("conciliar-autor", {
        body: { autor_id: autorId, qid: aw.qid },
      });
      if (error) throw error;
      setEnriquecidos((prev) => new Set(prev).add(aw.qid));
      toast.success(`Autor enriquecido com ${aw.qid}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enriquecer autor");
    } finally {
      setActing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(obraConciliada)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Enriquecer via Wikidata — {obra.titulo_original}
          </DialogTitle>
          <DialogDescription>
            {etapa === "autores"
              ? "Passo 2 de 2 — enriqueça os autores da obra com os dados do Wikidata."
              : "Passo 1 de 2 — escolha o item do Wikidata que corresponde a esta obra."}
          </DialogDescription>
        </DialogHeader>

        {etapa === "busca" && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Buscando candidatos no Wikidata…</p>
          </div>
        )}

        {etapa === "candidatos" && (
          <div className="space-y-4">
            {/* Obra atual */}
            <div className="border rounded-md p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Dados atuais da obra</p>
              <p className="font-semibold">{obraAtual?.titulo_original ?? obra.titulo_original}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {obraAtual?.ano_primeira_publicacao ?? "sem ano"} · {obraAtual?.idioma_original ?? "sem idioma"}
              </p>
              {obraAtual?.sinopse_padrao ? (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{obraAtual.sinopse_padrao}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60 mt-1 italic">Sem sinopse</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={sobrescrever} onCheckedChange={(v) => setSobrescrever(v === true)} />
              Sobrescrever dados existentes (por padrão, só preenche campos vazios)
            </label>

            {candidatos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum candidato encontrado no Wikidata para esta obra.
              </p>
            ) : (
              <div className="grid gap-3">
                {candidatos.map((c) => (
                  <div key={c.qid} className="border rounded-md p-4 flex items-start gap-3">
                    <ScorePill s={c.score} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.titulo}</p>
                      {c.descricao && (
                        <p className="text-sm text-muted-foreground mt-0.5">{c.descricao}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        {c.ano_publicacao && <span>{c.ano_publicacao}</span>}
                        {c.idioma_original && <span>{c.idioma_original}</span>}
                        {c.autor_labels.length > 0 && <span>{c.autor_labels.join(", ")}</span>}
                        <a
                          href={c.url_wikidata}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          {c.qid} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!!acting}
                      onClick={() => conciliarObra(c)}
                    >
                      {acting === c.qid
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      Conciliar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={semCorrespondencia} disabled={!!acting}>
                {acting === "sem-corresp"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4" />}
                Nenhum corresponde — marcar sem conciliação
              </Button>
            </div>
          </div>
        )}

        {etapa === "autores" && (
          <div className="space-y-4">
            <div className="grid gap-3">
              {autoresWikidata.map((aw) => {
                const feito = enriquecidos.has(aw.qid);
                return (
                  <div key={aw.qid} className="border rounded-md p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{aw.nome}</p>
                          <a
                            href={aw.url_wikidata}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline"
                          >
                            {aw.qid} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                      {feito && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Enriquecido
                        </Badge>
                      )}
                    </div>

                    {!feito && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">Autor local:</span>
                        <Select
                          value={selecoes[aw.qid] ?? ""}
                          onValueChange={(v) => setSelecoes((prev) => ({ ...prev, [aw.qid]: v }))}
                        >
                          <SelectTrigger className="h-8 w-56 text-sm">
                            <SelectValue placeholder="Selecionar autor…" />
                          </SelectTrigger>
                          <SelectContent>
                            {autoresObra.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={!!acting || !selecoes[aw.qid]}
                          onClick={() => enriquecerAutor(aw)}
                        >
                          {acting === aw.qid
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <ArrowRight className="w-4 h-4" />}
                          Enriquecer
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" onClick={() => onClose(true)}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
