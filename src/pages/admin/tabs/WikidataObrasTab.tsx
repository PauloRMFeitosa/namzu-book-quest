import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, BookOpen, RefreshCw, Loader2 } from "lucide-react";
import { AdminEmptyState } from "../components/AdminEmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Candidato {
  id: string;
  obra_id: string;
  qid: string;
  url_wikidata: string;
  titulo: string;
  descricao: string | null;
  ano_publicacao: number | null;
  idioma_original: string | null;
  score_namzu: number;
  dados_externos: Record<string, unknown>;
}

interface Obra {
  id: string;
  titulo_original: string;
  ano_primeira_publicacao: number | null;
  idioma_original: string | null;
  metadata_score: number | null;
  metadata_source: string | null;
  candidatos: Candidato[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const scoreBadge = (s: number) => {
  if (s >= 80) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs">{s}</Badge>;
  if (s >= 60) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs">{s}</Badge>;
  return <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 text-xs">{s}</Badge>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const WikidataObrasTab = () => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // candidato id or "rejeitar-<obra_id>"

  // ── Load obras with pending candidates ──────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      // obras onde metadata_score está na faixa 50-79 (candidatos para revisão)
      const { data: obrasData, error: obrasErr } = await (supabase as any)
        .from("obras")
        .select("id, titulo_original, ano_primeira_publicacao, idioma_original, metadata_score, metadata_source")
        .gte("metadata_score", 50)
        .lte("metadata_score", 79)
        .order("metadata_score", { ascending: false })
        .limit(100);

      if (obrasErr) throw obrasErr;
      if (!obrasData?.length) { setObras([]); setLoading(false); return; }

      const obraIds = obrasData.map((o: any) => o.id);

      const { data: candidatos, error: candErr } = await (supabase as any)
        .from("obras_candidatos_wikidata")
        .select("id, obra_id, qid, url_wikidata, titulo, descricao, ano_publicacao, idioma_original, score_namzu, dados_externos")
        .in("obra_id", obraIds)
        .order("score_namzu", { ascending: false });

      if (candErr) throw candErr;

      const candByObra: Record<string, Candidato[]> = {};
      for (const c of (candidatos ?? [])) {
        if (!candByObra[c.obra_id]) candByObra[c.obra_id] = [];
        candByObra[c.obra_id].push(c);
      }

      const merged: Obra[] = obrasData
        .map((o: any) => ({ ...o, candidatos: candByObra[o.id] ?? [] }))
        .filter((o: Obra) => o.candidatos.length > 0); // só obras que ainda têm candidatos

      setObras(merged);
      // seleciona a primeira obra se nenhuma selecionada ou se a selecionada sumiu
      setSelectedObraId((prev) => {
        if (prev && merged.find((o) => o.id === prev)) return prev;
        return merged[0]?.id ?? null;
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao carregar candidatos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectedObra = obras.find((o) => o.id === selectedObraId) ?? null;

  // ── Approve: apply Wikidata data to obra ────────────────────────────────────
  const aprovar = async (candidato: Candidato) => {
    setActionLoading(candidato.id);
    try {
      // 1. Atualiza a obra com dados do Wikidata
      const update: Record<string, unknown> = {
        metadata_source: "wikidata",
        metadata_score: candidato.score_namzu,
        metadata_checked_at: new Date().toISOString(),
      };
      if (candidato.ano_publicacao && !selectedObra?.ano_primeira_publicacao) {
        update.ano_primeira_publicacao = candidato.ano_publicacao;
      }
      if (candidato.idioma_original && !selectedObra?.idioma_original) {
        update.idioma_original = candidato.idioma_original;
      }
      // Aplica campos extras de dados_externos se disponíveis
      const ext = candidato.dados_externos as any;
      if (ext?.descricao && !ext?.sinopse_padrao) {
        update.sinopse_padrao = ext.descricao;
      }

      const { error: updErr } = await (supabase as any)
        .from("obras")
        .update(update)
        .eq("id", candidato.obra_id);
      if (updErr) throw updErr;

      // 2. Remove todos os candidatos dessa obra (conciliação encerrada)
      const { error: delErr } = await (supabase as any)
        .from("obras_candidatos_wikidata")
        .delete()
        .eq("obra_id", candidato.obra_id);
      if (delErr) throw delErr;

      toast.success(`Candidato ${candidato.qid} aprovado para "${selectedObra?.titulo_original}"`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao aprovar candidato");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject: mark obra as reviewed with no match ─────────────────────────────
  const rejeitarObra = async (obra: Obra) => {
    setActionLoading(`rejeitar-${obra.id}`);
    try {
      // score -1 = revisado manualmente, sem conciliação
      const { error: updErr } = await (supabase as any)
        .from("obras")
        .update({ metadata_score: -1, metadata_checked_at: new Date().toISOString() })
        .eq("id", obra.id);
      if (updErr) throw updErr;

      const { error: delErr } = await (supabase as any)
        .from("obras_candidatos_wikidata")
        .delete()
        .eq("obra_id", obra.id);
      if (delErr) throw delErr;

      toast.success(`"${obra.titulo_original}" marcada sem conciliação`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao rejeitar candidatos");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando candidatos…
      </div>
    );
  }

  if (obras.length === 0) {
    return (
      <AdminEmptyState
        icon={CheckCircle2}
        title="Nenhuma obra aguarda revisão"
        description="Todas as obras com candidatos Wikidata já foram conciliadas ou nenhuma obra tem score entre 50 e 79."
        actionLabel="Recarregar"
        onAction={load}
      />
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[400px]">
      {/* ── Left: lista de obras ───────────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {obras.length} obra{obras.length !== 1 ? "s" : ""}
          </p>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={load} title="Recarregar">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        {obras.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelectedObraId(o.id)}
            className={[
              "text-left rounded-md px-3 py-2 text-sm transition-colors border",
              o.id === selectedObraId
                ? "bg-secondary border-border font-medium"
                : "border-transparent hover:bg-muted/60",
            ].join(" ")}
          >
            <p className="leading-tight truncate">{o.titulo_original}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {scoreBadge(o.metadata_score ?? 0)}
              <span className="text-xs text-muted-foreground">
                {o.candidatos.length} candidato{o.candidatos.length !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Right: candidatos da obra selecionada ──────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedObra ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Selecione uma obra
          </div>
        ) : (
          <div className="space-y-4">
            {/* Obra header */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{selectedObra.titulo_original}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedObra.ano_primeira_publicacao ?? "—"} · {selectedObra.idioma_original ?? "—"} · score atual: {selectedObra.metadata_score ?? "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={!!actionLoading}
                    onClick={() => rejeitarObra(selectedObra)}
                  >
                    {actionLoading === `rejeitar-${selectedObra.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Sem conciliação
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Candidatos */}
            {selectedObra.candidatos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum candidato encontrado para esta obra.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedObra.candidatos.map((c) => {
                  const ext = c.dados_externos as any;
                  const autor = ext?.autor ?? ext?.autores?.[0] ?? null;
                  const isApproving = actionLoading === c.id;
                  return (
                    <Card key={c.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Score badge */}
                          <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
                            {scoreBadge(c.score_namzu)}
                            <span className="text-[10px] text-muted-foreground">score</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-sm leading-tight">{c.titulo}</p>
                            {c.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              {c.ano_publicacao && <span>Ano: {c.ano_publicacao}</span>}
                              {c.idioma_original && <span>Idioma: {c.idioma_original}</span>}
                              {autor && <span>Autor: {autor}</span>}
                              <a
                                href={c.url_wikidata}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                              >
                                {c.qid}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>

                            {/* dados_externos details table */}
                            {Object.keys(ext ?? {}).length > 0 && (
                              <details className="mt-1">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver dados completos
                                </summary>
                                <Table className="mt-1 text-xs">
                                  <TableBody>
                                    {Object.entries(ext).map(([k, v]) => (
                                      <TableRow key={k} className="h-6">
                                        <TableCell className="py-0.5 font-medium text-muted-foreground w-32">{k}</TableCell>
                                        <TableCell className="py-0.5 break-all">
                                          {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </details>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="shrink-0">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={!!actionLoading}
                              onClick={() => aprovar(c)}
                            >
                              {isApproving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Aprovar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
