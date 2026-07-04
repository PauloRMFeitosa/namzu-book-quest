import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Check, X, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Candidato = {
  id: string;
  qid: string;
  url_wikidata: string;
  nome: string;
  descricao: string | null;
  data_nascimento: string | null;
  data_falecimento: string | null;
  nacionalidade: string | null;
  foto_url: string | null;
  score_namzu: number;
};

type AutorOriginal = {
  id: string;
  nome_completo: string;
  descricao?: string | null;
  data_nascimento?: string | null;
  data_falecimento?: string | null;
  nacionalidade?: string | null;
  foto_url?: string | null;
};

interface Props {
  autor: { id: string; nome_completo: string };
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

export const RevisaoManualAutorDialog = ({ autor, open, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [original, setOriginal] = useState<AutorOriginal | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [{ data: orig }, { data: cands }] = await Promise.all([
        (supabase as any).from("autores").select("id, nome_completo, descricao, data_nascimento, data_falecimento, nacionalidade, foto_url").eq("id", autor.id).maybeSingle(),
        (supabase as any).from("autores_candidatos_wikidata").select("*").eq("autor_id", autor.id).order("score_namzu", { ascending: false }).limit(5),
      ]);
      setOriginal(orig ?? { id: autor.id, nome_completo: autor.nome_completo });
      setCandidatos((cands ?? []) as Candidato[]);
      setLoading(false);
    })();
  }, [open, autor.id, autor.nome_completo]);

  const conciliar = async (c: Candidato) => {
    setActing(c.id);
    try {
      const { error } = await (supabase as any).functions.invoke("conciliar-autor", {
        body: { autor_id: autor.id, qid: c.qid },
      });
      if (error) throw error;
      toast({ title: "Autor conciliado", description: c.nome });
      onClose(true);
    } catch (e: any) {
      toast({ title: "Erro ao conciliar", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const ignorarCandidato = async (c: Candidato) => {
    setActing(c.id);
    await (supabase as any).from("autores_candidatos_wikidata").delete().eq("id", c.id);
    setCandidatos((prev) => prev.filter((x) => x.id !== c.id));
    setActing(null);
  };

  const marcarNaoEncontrado = async () => {
    setActing("naoenc");
    try {
      await (supabase as any).from("autores_candidatos_wikidata").delete().eq("autor_id", autor.id);
      await (supabase as any)
        .from("autores")
        .update({ status_conciliacao: "nao_encontrado", data_ultima_conciliacao: new Date().toISOString() })
        .eq("id", autor.id);
      toast({ title: "Marcado como não encontrado" });
      onClose(true);
    } finally {
      setActing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão manual — {autor.nome_completo}</DialogTitle>
          <DialogDescription>
            Compare o autor original com até 5 candidatos do Wikidata.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Original */}
            <div className="border rounded-md p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Autor original</p>
              <div className="flex gap-4">
                {original?.foto_url ? (
                  <img src={original.foto_url} alt={original.nome_completo} className="w-20 h-20 object-cover rounded" />
                ) : <div className="w-20 h-20 bg-muted rounded" />}
                <div className="flex-1">
                  <p className="font-semibold">{original?.nome_completo}</p>
                  {original?.descricao && <p className="text-sm text-muted-foreground">{original.descricao}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {original?.nacionalidade ?? "—"} · {original?.data_nascimento ?? "?"} – {original?.data_falecimento ?? ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Candidatos */}
            {candidatos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum candidato disponível para revisão.
              </p>
            ) : (
              <div className="grid gap-3">
                {candidatos.map((c) => (
                  <div key={c.id} className="border rounded-md p-4">
                    <div className="flex gap-4">
                      {c.foto_url ? (
                        <img src={c.foto_url} alt={c.nome} className="w-20 h-20 object-cover rounded" />
                      ) : <div className="w-20 h-20 bg-muted rounded" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold">{c.nome}</p>
                            <a
                              href={c.url_wikidata}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              {c.qid} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <Badge className="bg-primary/15 text-primary">Score {c.score_namzu}</Badge>
                        </div>
                        {c.descricao && <p className="text-sm text-muted-foreground mt-1">{c.descricao}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.nacionalidade ?? "—"} · {c.data_nascimento ?? "?"} – {c.data_falecimento ?? ""}
                        </p>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Button size="sm" onClick={() => conciliar(c)} disabled={!!acting}>
                            {acting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Conciliar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => ignorarCandidato(c)} disabled={!!acting}>
                            <X className="w-4 h-4" /> Ignorar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={marcarNaoEncontrado} disabled={!!acting}>
                <Ban className="w-4 h-4" /> Marcar como não encontrado
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
