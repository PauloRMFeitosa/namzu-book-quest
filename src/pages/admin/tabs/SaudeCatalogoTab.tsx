import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, BookOpen, Image as ImageIcon, Languages, Tag, FileText } from "lucide-react";

type Obra = {
  id: string;
  titulo_original: string;
  sinopse_padrao: string | null;
  capa_padrao_url: string | null;
  idioma_original: string | null;
  ano_primeira_publicacao: number | null;
  metadata_score: number | null;
  metadata_source: string | null;
  metadata_checked_at: string | null;
  obra_generos: { genero_id: string }[];
};

// Score 0-100 ponderado
const PESOS = {
  titulo: 10,
  sinopse: 25,
  capa: 20,
  idioma: 10,
  ano: 10,
  generos: 25,
};

const calcScore = (o: Obra): number => {
  let s = 0;
  if (o.titulo_original?.trim()) s += PESOS.titulo;
  if (o.sinopse_padrao && o.sinopse_padrao.trim().length >= 40) s += PESOS.sinopse;
  if (o.capa_padrao_url?.trim()) s += PESOS.capa;
  if (o.idioma_original?.trim()) s += PESOS.idioma;
  if (o.ano_primeira_publicacao) s += PESOS.ano;
  if ((o.obra_generos?.length ?? 0) > 0) s += PESOS.generos;
  return s;
};

const scoreBadge = (s: number) => {
  if (s >= 80) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Bom ({s})</Badge>;
  if (s >= 50) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Médio ({s})</Badge>;
  return <Badge className="bg-destructive/15 text-destructive">Crítico ({s})</Badge>;
};

const MetricCard = ({
  icon: Icon, label, value, total, tone = "default",
}: { icon: any; label: string; value: number; total?: number; tone?: "default" | "warn" | "good" }) => {
  const pct = total ? Math.round((value / total) * 100) : null;
  const toneClass =
    tone === "warn" ? "text-destructive" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          <span className="truncate">{label}</span>
        </div>
        <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value.toLocaleString("pt-BR")}</div>
        {pct !== null && (
          <div className="mt-2 space-y-1">
            <Progress value={pct} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{pct}% do catálogo</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const SaudeCatalogoTab = () => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("obras")
        .select(
          "id, titulo_original, sinopse_padrao, capa_padrao_url, idioma_original, ano_primeira_publicacao, metadata_score, metadata_source, metadata_checked_at, obra_generos(genero_id)"
        )
        .order("created_at", { ascending: false })
        .limit(2000);
      setObras((data ?? []) as Obra[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = obras.length;
    const comGeneros = obras.filter((o) => (o.obra_generos?.length ?? 0) > 0).length;
    const comSinopse = obras.filter((o) => !!o.sinopse_padrao?.trim()).length;
    const comCapa = obras.filter((o) => !!o.capa_padrao_url?.trim()).length;
    const comIdioma = obras.filter((o) => !!o.idioma_original?.trim()).length;
    const comAno = obras.filter((o) => !!o.ano_primeira_publicacao).length;

    const scored = obras.map((o) => ({ ...o, _score: calcScore(o) }));
    const avg = total ? Math.round(scored.reduce((a, b) => a + b._score, 0) / total) : 0;
    const piores = [...scored].sort((a, b) => a._score - b._score).slice(0, 25);

    const checados = obras.filter((o) => !!o.metadata_checked_at).length;

    return {
      total,
      comGeneros, semGeneros: total - comGeneros,
      comSinopse, semSinopse: total - comSinopse,
      comCapa, semCapa: total - comCapa,
      comIdioma, semIdioma: total - comIdioma,
      comAno, semAno: total - comAno,
      avg, piores, checados,
    };
  }, [obras]);

  const lacunas = useMemo(
    () => [
      { label: "Sem gêneros", value: stats.semGeneros },
      { label: "Sem sinopse", value: stats.semSinopse },
      { label: "Sem capa", value: stats.semCapa },
      { label: "Sem ano de publicação", value: stats.semAno },
      { label: "Sem idioma", value: stats.semIdioma },
    ].sort((a, b) => b.value - a.value),
    [stats]
  );

  if (loading) return <p className="text-sm text-muted-foreground mt-4">Carregando catálogo…</p>;

  return (
    <div className="space-y-6 mt-4">
      {/* Resumo macro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Visão geral
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total de livros</p>
            <p className="text-3xl font-bold text-primary">{stats.total.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Qualidade média do catálogo</p>
            <p className="text-3xl font-bold">{stats.avg}/100</p>
            <Progress value={stats.avg} className="h-2 mt-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Verificados (metadata_checked_at)</p>
            <p className="text-3xl font-bold">{stats.checados.toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-muted-foreground">
              {stats.total ? Math.round((stats.checados / stats.total) * 100) : 0}% já passaram por verificação
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Métricas detalhadas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={Tag} label="Com gêneros" value={stats.comGeneros} total={stats.total} tone="good" />
        <MetricCard icon={Tag} label="Sem gêneros" value={stats.semGeneros} total={stats.total} tone="warn" />
        <MetricCard icon={FileText} label="Com sinopse" value={stats.comSinopse} total={stats.total} tone="good" />
        <MetricCard icon={FileText} label="Sem sinopse" value={stats.semSinopse} total={stats.total} tone="warn" />
        <MetricCard icon={ImageIcon} label="Com capa" value={stats.comCapa} total={stats.total} tone="good" />
        <MetricCard icon={ImageIcon} label="Sem capa" value={stats.semCapa} total={stats.total} tone="warn" />
        <MetricCard icon={Languages} label="Com idioma" value={stats.comIdioma} total={stats.total} tone="good" />
        <MetricCard icon={Languages} label="Sem idioma" value={stats.semIdioma} total={stats.total} tone="warn" />
        <MetricCard icon={BookOpen} label="Com ano" value={stats.comAno} total={stats.total} />
        <MetricCard icon={BookOpen} label="Sem ano" value={stats.semAno} total={stats.total} tone="warn" />
      </div>

      {/* Lacunas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Maiores lacunas do catálogo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lacunas.map((l) => {
            const pct = stats.total ? Math.round((l.value / stats.total) * 100) : 0;
            return (
              <div key={l.label}>
                <div className="flex justify-between text-sm">
                  <span>{l.label}</span>
                  <span className="text-muted-foreground">{l.value.toLocaleString("pt-BR")} ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-1.5 mt-1" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Piores scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Livros com menor qualidade de metadados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Fonte</TableHead>
                <TableHead className="hidden sm:table-cell">Verificado em</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="hidden md:table-cell">Faltando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.piores.map((o: any) => {
                const faltando: string[] = [];
                if (!o.sinopse_padrao?.trim()) faltando.push("sinopse");
                if (!o.capa_padrao_url?.trim()) faltando.push("capa");
                if (!o.idioma_original?.trim()) faltando.push("idioma");
                if (!o.ano_primeira_publicacao) faltando.push("ano");
                if ((o.obra_generos?.length ?? 0) === 0) faltando.push("gêneros");
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium max-w-[260px] truncate">{o.titulo_original}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {o.metadata_source ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {o.metadata_checked_at ? new Date(o.metadata_checked_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>{scoreBadge(o._score)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {faltando.length ? faltando.join(", ") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
