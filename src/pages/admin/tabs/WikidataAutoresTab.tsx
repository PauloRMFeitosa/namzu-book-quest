import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Loader2, User } from "lucide-react";
import { AdminEmptyState } from "../components/AdminEmptyState";

// ─────────────────────────────────────────────────────────────────────────────

interface Candidato {
  id: string;
  autor_id: string;
  qid: string;
  url_wikidata: string;
  nome: string;
  descricao: string | null;
  data_nascimento: string | null;
  data_falecimento: string | null;
  nacionalidade: string | null;
  foto_url: string | null;
  score_namzu: number;
}

interface Autor {
  id: string;
  nome_completo: string;
  foto_url: string | null;
  nacionalidade: string | null;
  status_conciliacao: string;
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

const fmtDate = (d: string | null) => {
  if (!d) return null;
  return d.slice(0, 4); // só o ano
};

// ─────────────────────────────────────────────────────────────────────────────

export const WikidataAutoresTab = () => {
  const [autores, setAutores] = useState<Autor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // 1. autores com status revisao_manual
      const { data: autoresData, error: e1 } = await (supabase as any)
        .from("autores")
        .select("id, nome_completo, foto_url, nacionalidade, status_conciliacao")
        .eq("status_conciliacao", "revisao_manual")
        .order("nome_completo")
        .limit(200);
      if (e1) throw e1;
      if (!autoresData?.length) { setAutores([]); setLoading(false); return; }

      const ids = autoresData.map((a: any) => a.id);

      // 2. candidatos para esses autores
      const { data: cands, error: e2 } = await (supabase as any)
        .from("autores_candidatos_wikidata")
        .select("id, autor_id, qid, url_wikidata, nome, descricao, data_nascimento, data_falecimento, nacionalidade, foto_url, score_namzu")
        .in("autor_id", ids)
        .order("score_namzu", { ascending: false });
      if (e2) throw e2;

      const byAutor: Record<string, Candidato[]> = {};
      for (const c of cands ?? []) {
        if (!byAutor[c.autor_id]) byAutor[c.autor_id] = [];
        byAutor[c.autor_id].push(c);
      }

      const merged: Autor[] = autoresData
        .map((a: any) => ({ ...a, candidatos: byAutor[a.id] ?? [] }))
        .filter((a: Autor) => a.candidatos.length > 0);

      setAutores(merged);
      setSelectedId((prev) =>
        prev && merged.find((a) => a.id === prev) ? prev : merged[0]?.id ?? null
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const autor = autores.find((a) => a.id === selectedId) ?? null;

  // Aprovar: aplica dados do candidato ao autor
  const aprovar = async (c: Candidato) => {
    setBusy(c.id);
    try {
      const update: Record<string, unknown> = {
        status_conciliacao: "conciliado",
        tentativas_conciliacao: 0,
        data_ultima_conciliacao: new Date().toISOString(),
      };
      if (c.foto_url && !autor?.foto_url) update.foto_url = c.foto_url;
      if (c.descricao) update.descricao = c.descricao;
      if (c.data_nascimento) update.data_nascimento = c.data_nascimento;
      if (c.data_falecimento) update.data_falecimento = c.data_falecimento;
      if (c.nacionalidade && !autor?.nacionalidade) update.nacionalidade = c.nacionalidade;

      const { error: e1 } = await (supabase as any).from("autores").update(update).eq("id", c.autor_id);
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any).from("autores_candidatos_wikidata").delete().eq("autor_id", c.autor_id);
      if (e2) throw e2;

      toast.success(`${c.qid} aprovado para "${autor?.nome_completo}"`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao aprovar");
    } finally {
      setBusy(null);
    }
  };

  // Rejeitar: marca como nao_encontrado, descarta candidatos
  const rejeitar = async (a: Autor) => {
    setBusy(`rej-${a.id}`);
    try {
      const { error: e1 } = await (supabase as any)
        .from("autores")
        .update({ status_conciliacao: "nao_encontrado", data_ultima_conciliacao: new Date().toISOString() })
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any).from("autores_candidatos_wikidata").delete().eq("autor_id", a.id);
      if (e2) throw e2;
      toast.success(`"${a.nome_completo}" marcado sem conciliação`);
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

  if (!autores.length) return (
    <AdminEmptyState icon={CheckCircle2} title="Nenhum autor aguarda revisão"
      description="Todos os autores com candidatos já foram conciliados." actionLabel="Recarregar" onAction={load} />
  );

  return (
    <div className="flex gap-0 border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 420 }}>

      {/* ── Sidebar autores ────────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col border-r bg-muted/20">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {autores.length} autor{autores.length !== 1 ? "es" : ""}
          </span>
          <button onClick={load} title="Recarregar" className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {autores.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={[
                "w-full text-left px-3 py-2.5 text-sm transition-colors border-l-2 flex items-center gap-2",
                a.id === selectedId
                  ? "bg-background border-primary font-medium"
                  : "border-transparent hover:bg-muted/50 text-muted-foreground",
              ].join(" ")}
            >
              {/* Avatar */}
              {a.foto_url ? (
                <img src={a.foto_url} alt={a.nome_completo} className="h-6 w-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate leading-tight text-xs">{a.nome_completo}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.candidatos.length} candidato{a.candidatos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Painel candidatos ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!autor ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Selecione um autor
          </div>
        ) : (
          <>
            {/* Autor header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/10">
              <div className="flex items-center gap-2 min-w-0">
                {autor.foto_url ? (
                  <img src={autor.foto_url} alt={autor.nome_completo} className="h-8 w-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{autor.nome_completo}</p>
                  <p className="text-xs text-muted-foreground">{autor.nacionalidade ?? "Nacionalidade desconhecida"}</p>
                </div>
              </div>
              <Button
                size="sm" variant="outline"
                className="shrink-0 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-2"
                disabled={!!busy}
                onClick={() => rejeitar(autor)}
              >
                {busy === `rej-${autor.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                <span className="ml-1">Sem conciliação</span>
              </Button>
            </div>

            {/* Candidatos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {autor.candidatos.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  {/* Foto do candidato */}
                  <div className="shrink-0">
                    {c.foto_url ? (
                      <img src={c.foto_url} alt={c.nome} className="h-14 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-14 w-10 rounded bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <ScorePill s={c.score_namzu} />
                      <p className="font-medium text-sm leading-snug">{c.nome}</p>
                    </div>
                    {c.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {(c.data_nascimento || c.data_falecimento) && (
                        <span>
                          {fmtDate(c.data_nascimento) ?? "?"}
                          {c.data_falecimento ? ` – ${fmtDate(c.data_falecimento)}` : ""}
                        </span>
                      )}
                      {c.nacionalidade && <span>{c.nacionalidade}</span>}
                      <a
                        href={c.url_wikidata} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:underline"
                      >
                        {c.qid} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    {/* Campos que serão aplicados */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {c.foto_url && !autor.foto_url && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded px-1.5 py-0.5">+ foto</span>
                      )}
                      {c.descricao && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5">+ bio</span>
                      )}
                      {c.data_nascimento && (
                        <span className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded px-1.5 py-0.5">+ nascimento</span>
                      )}
                      {c.data_falecimento && (
                        <span className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded px-1.5 py-0.5">+ falecimento</span>
                      )}
                      {c.nacionalidade && !autor.nacionalidade && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5">+ nacionalidade</span>
                      )}
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
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
