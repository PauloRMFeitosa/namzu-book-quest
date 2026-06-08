import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, Loader2, RefreshCcw, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Resumo = {
  total: number;
  comGenero: number;
  semGenero: number;
  comIsbn: number;
  semIsbn: number;
};

type LogItem = {
  obra_id: string;
  titulo: string;
  fonte: "google_books" | "open_library" | "nenhuma";
  resultado: "sucesso" | "nao_encontrado" | "erro";
  generos?: string[];
  erro?: string;
};

type Execucao = {
  data: string;
  processadas: number;
  sucesso: number;
  sem_retorno: number;
  fonte: string;
  logs: LogItem[];
};

const fonteLabel = (f: string) =>
  f === "google_books" ? "Google Books" : f === "open_library" ? "Open Library" : "Nenhuma";

const resultadoBadge = (r: LogItem["resultado"]) => {
  if (r === "sucesso") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Sucesso</Badge>;
  if (r === "nao_encontrado") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Não encontrado</Badge>;
  return <Badge className="bg-destructive/15 text-destructive">Erro</Badge>;
};

export const ReprocessamentoTab = () => {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [exec, setExec] = useState<Execucao | null>(null);

  const carregarResumo = useCallback(async () => {
    setLoadingResumo(true);
    const [{ data: obras }, { data: og }, { data: edicoes }] = await Promise.all([
      (supabase as any).from("obras").select("id").limit(5000),
      (supabase as any).from("obra_generos").select("obra_id").limit(20000),
      (supabase as any).from("edicoes").select("obra_id, isbn_13").limit(20000),
    ]);
    const total = (obras ?? []).length;
    const setComGenero = new Set((og ?? []).map((r: any) => r.obra_id));
    const setComIsbn = new Set(
      (edicoes ?? [])
        .filter((e: any) => !!e.isbn_13 && /^\d{13}$/.test(String(e.isbn_13).replace(/[-\s]/g, "")))
        .map((e: any) => e.obra_id),
    );
    const comGenero = (obras ?? []).filter((o: any) => setComGenero.has(o.id)).length;
    const comIsbn = (obras ?? []).filter((o: any) => setComIsbn.has(o.id)).length;
    setResumo({
      total,
      comGenero,
      semGenero: total - comGenero,
      comIsbn,
      semIsbn: total - comIsbn,
    });
    setLoadingResumo(false);
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const executar = async (mode: "test10" | "batch50" | "all") => {
    setRunning(mode);
    try {
      const { data, error } = await (supabase as any).functions.invoke("reprocessar-generos", {
        body: { mode },
      });
      if (error) throw error;
      setExec({
        data: data.executado_em ?? new Date().toISOString(),
        processadas: data.processadas ?? 0,
        sucesso: data.sucesso ?? 0,
        sem_retorno: data.sem_retorno ?? 0,
        fonte: data.fonte ?? "—",
        logs: data.logs ?? [],
      });
      toast({
        title: "Reprocessamento concluído",
        description: `${data.sucesso}/${data.processadas} obras classificadas.`,
      });
      carregarResumo();
    } catch (e: any) {
      toast({ title: "Erro no reprocessamento", description: e?.message ?? "Falha desconhecida", variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const obrasSemGeneroComIsbn = resumo
    ? Math.min(resumo.semGenero, resumo.comIsbn) // estimativa
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Resumo */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Resumo do catálogo
            </CardTitle>
            <CardDescription>Visão geral antes do reprocessamento</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={carregarResumo} disabled={loadingResumo}>
            <RefreshCcw className={`w-4 h-4 ${loadingResumo ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Metric label="Total de obras" value={resumo?.total ?? 0} />
          <Metric label="Com gênero" value={resumo?.comGenero ?? 0} tone="good" />
          <Metric label="Sem gênero" value={resumo?.semGenero ?? 0} tone="warn" />
          <Metric label="Com ISBN13" value={resumo?.comIsbn ?? 0} tone="good" />
          <Metric label="Sem ISBN13" value={resumo?.semIsbn ?? 0} tone="warn" />
        </CardContent>
      </Card>

      {/* Módulo 1: Gêneros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" /> Gêneros
          </CardTitle>
          <CardDescription>
            Classifica obras utilizando Google Books e Open Library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Obras sem gênero</p>
              <p className="text-2xl font-bold text-destructive">{resumo?.semGenero ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Obras com ISBN13 disponíveis</p>
              <p className="text-2xl font-bold">{resumo?.comIsbn ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">
                ≈ {obrasSemGeneroComIsbn} sem gênero com ISBN
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => executar("test10")} disabled={!!running} variant="outline">
              {running === "test10" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar 10"}
            </Button>
            <Button onClick={() => executar("batch50")} disabled={!!running} variant="secondary">
              {running === "batch50" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Processar 50"}
            </Button>
            <Button onClick={() => executar("all")} disabled={!!running}>
              {running === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Processar Todos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Últimos Resultados */}
      {exec && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Resultados</CardTitle>
            <CardDescription>
              {new Date(exec.data).toLocaleString("pt-BR")} · Processadas: {exec.processadas} · Sucesso:{" "}
              {exec.sucesso} · Sem retorno: {exec.sem_retorno} · Fonte: {exec.fonte}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="hidden md:table-cell">Gêneros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exec.logs.map((l) => (
                  <TableRow key={l.obra_id}>
                    <TableCell className="font-medium max-w-[260px] truncate">{l.titulo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fonteLabel(l.fonte)}</TableCell>
                    <TableCell>{resultadoBadge(l.resultado)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {l.generos?.length ? l.generos.join(", ") : l.erro ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Metric = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn" | "good";
}) => {
  const toneClass =
    tone === "warn" ? "text-destructive" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-primary";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value.toLocaleString("pt-BR")}</p>
    </div>
  );
};
