import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Loader2, BookOpen } from "lucide-react";
import { AdminEmptyState } from "../components/AdminEmptyState";

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
  candidatos: Candidato[];
}

// ─────────────────────────────────────────────────────────────────────────────

const ScorePill = ({ s }: { s: number }) => {
  const cls =
    s >= 75 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" :
    s >= 60 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20" :
              "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20";
  return (
    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-semibold border ${cls}`}>
      {s}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const WikidataObrasTab = () => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: obrasData, error: e1 } = await (supabase as any)
        .from("obras")
        .select("id, titulo_original, ano_primeira_publicacao, idioma_original, metadata_score")
        .gte("metadata_score", 50)
        .lte("metadata_score", 79)
        .order("metadata_score", { ascending: false })
        .limit(100);
      if (e1) throw e1;
      if (!obrasData?.length) { setObras([]); setLoading(false); return; }

      const ids = obrasData.map((o: any) => o.id);
      const { data: cands, error: e2 } = await (supabase as any)
        .from("obras_candidatos_wikidata")
        .select("id, obra_id, qid, url_wikidata, titulo, descricao, ano_publicacao, idioma_original, score_namzu, dados_externos")
        .in("obra_id", ids)
        .order("score_namzu", { ascending: false });
      if (e2) throw e2;

      const byObra: Record<string, Candidato[]> = {};
      for (const c of cands ?? []) {
        if (!byObra[c.obra_id]) byObra[c.obra_id] = [];
        byObra[c.obra_id].push(c);
      }

      const merged: Obra[] = obrasData
        .map((o: any) => ({ ...o, candidatos: byObra[o.id] ?? [] }))
        .filter((o: Obra) => o.candidatos.length > 0);

      setObras(merged);
      setSelectedId((prev) =>
        prev && merged.find((o) => o.id === prev) ? prev : merged[0]?.id ?? null
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const obra = obras.find((o) => o.id === selectedId) ?? null;

  const aprovar = async (c: Candidato) => {
    setBusy(c.id);
    try {
      const update: Record<string, unknown> = {
        metadata_source: "wikidata",
        metadata_score: c.score_namzu,
        metadata_checked_at: new Date().toISOString(),
      };
      if (c.ano_publicacao && !obra?.ano_primeira_publicacao) update.ano_primeira_publicacao = c.ano_publicacao;
      if (c.idioma_original && !obra?.idioma_original) update.idioma_original = c.idioma_original;

      const { error: e1 } = await (supabase as any).from("obras").update(update).eq("id", c.obra_id);
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any).from("obras_candidatos_wikidata").delete().eq("obra_id", c.obra_id);
      if (e2) throw e2;

      toast.success(`${c.qid} aprovado para "${obra?.titulo_original}"`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao aprovar");
    } finally {
      setBusy(null);
    }
  };

  const rejeitar = async (o: Obra) => {
    setBusy(`rej-${o.id}`);
    try {
      const { error: e1 } = await (supabase as any)
        .from("obras").update({ metadata_score: -1, metadata_checked_at: new Date().toISOString() }).eq("id", o.id);
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any).from("obras_candidatos_wikidata").delete().eq("obra_id", o.id);
      if (e2) throw e2;
      toast.success(`"${o.titulo_original}" descartada`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro");
    } finally {
      setBusy(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );

  if (!obras.length) return (
    <AdminEmptyState icon={CheckCircle2} title="Nenhuma obra aguarda revisão"
      description="Todas as obras com candidatos já foram conciliadas." actionLabel="Recarregar" onAction={load} />
  );

  return (
    <div className="flex gap-0 border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 420 }}>

      {/* ── Sidebar obras ─────────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col border-r bg-muted/20">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {obras.length} obra{obras.length !== 1 ? "s" : ""}
          </span>
          <button onClick={load} title="Recarregar" className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto py-1">
          {obras.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={[
                "w-full text-left px-3 py-2.5 text-sm transition-colors border-l-2",
                o.id === selectedId
                  ? "bg-background border-primary font-medium"
                  : "border-transparent hover:bg-muted/50 text-muted-foreground",
              ].join(" ")}
            >
              <p className="truncate leading-tight">{o.titulo_original}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <ScorePill s={o.metadata_score ?? 0} />
                <span className="text-[11px] text-muted-foreground">
                  {o.candidatos.length} candidato{o.candidatos.length !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Painel candidatos ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!obra ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Selecione uma obra
          </div>
        ) : (
          <>
            {/* Obra header — compacto, sem card extra */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/10">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{obra.titulo_original}</p>
                <p className="text-xs text-muted-foreground">
                  {obra.ano_primeira_publicacao ?? "—"} · {obra.idioma_original ?? "—"} · score atual: {obra.metadata_score}
                </p>
              </div>
              <Button
                size="sm" variant="outline"
                className="shrink-0 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-2"
                disabled={!!busy}
                onClick={() => rejeitar(obra)}
              >
                {busy === `rej-${obra.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                <span className="ml-1">Sem conciliação</span>
              </Button>
            </div>

            {/* Candidatos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {obra.candidatos.map((c) => {
                const ext = c.dados_externos as any;
                const autor = ext?.autor ?? ext?.autores?.[0] ?? null;
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    {/* Score */}
                    <div className="shrink-0 pt-0.5">
                      <ScorePill s={c.score_namzu} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-sm leading-snug">{c.titulo}</p>
                      {c.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {c.ano_publicacao && <span>{c.ano_publicacao}</span>}
                        {c.idioma_original && <span>{c.idioma_original}</span>}
                        {autor && <span>{autor}</span>}
                        <a
                          href={c.url_wikidata} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          {c.qid} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>

                    {/* Aprovar */}
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={!!busy}
                        onClick={() => aprovar(c)}
                      >
                        {busy === c.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Aprovar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
