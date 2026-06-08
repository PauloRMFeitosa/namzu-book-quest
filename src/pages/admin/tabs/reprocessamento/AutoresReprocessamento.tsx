import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2, RefreshCcw, UserSearch, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RevisaoManualAutorDialog } from "./RevisaoManualAutorDialog";

type Resumo = {
  total: number;
  conciliado: number;
  pendente: number;
  revisao_manual: number;
  nao_encontrado: number;
};

type AutorRevisao = {
  id: string;
  nome_completo: string;
  status_conciliacao: string;
  tentativas_conciliacao: number;
};

type LogItem = {
  autor_id: string;
  nome: string;
  resultado: "sucesso" | "revisao_manual" | "nao_encontrado" | "erro";
  mensagem?: string | null;
  qid?: string;
  score?: number;
};

type Execucao = {
  id: string;
  data: string;
  processadas: number;
  sucesso: number;
  revisao_manual: number;
  nao_encontrado: number;
  erros: number;
  logs: LogItem[];
};

const STATUS_FILTROS = [
  { value: "pendente", label: "Pendente" },
  { value: "nao_encontrado", label: "Não encontrado" },
  { value: "revisao_manual", label: "Revisão manual" },
];

const resultadoBadge = (r: LogItem["resultado"]) => {
  if (r === "sucesso") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Conciliado</Badge>;
  if (r === "revisao_manual") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Revisão</Badge>;
  if (r === "nao_encontrado") return <Badge className="bg-muted text-muted-foreground">Não encontrado</Badge>;
  return <Badge className="bg-destructive/15 text-destructive">Erro</Badge>;
};

export const AutoresReprocessamento = () => {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [running, setRunning] = useState(false);
  const [exec, setExec] = useState<Execucao | null>(null);

  const [quantidade, setQuantidade] = useState<number>(10);
  const [statusFiltro, setStatusFiltro] = useState<string[]>(["pendente", "nao_encontrado", "revisao_manual"]);
  const [busca, setBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<Array<{ id: string; nome_completo: string }>>([]);
  const [autorSelecionado, setAutorSelecionado] = useState<{ id: string; nome_completo: string } | null>(null);

  const [revisao, setRevisao] = useState<AutorRevisao[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [revisaoAberta, setRevisaoAberta] = useState<AutorRevisao | null>(null);

  const carregarResumo = useCallback(async () => {
    setLoadingResumo(true);
    const { data } = await (supabase as any)
      .from("autores")
      .select("status_conciliacao")
      .limit(20000);
    const counts: any = { total: 0, conciliado: 0, pendente: 0, revisao_manual: 0, nao_encontrado: 0 };
    (data ?? []).forEach((r: any) => {
      counts.total++;
      const k = r.status_conciliacao ?? "pendente";
      if (counts[k] !== undefined) counts[k]++;
    });
    setResumo(counts);

    const { data: rev } = await (supabase as any)
      .from("autores")
      .select("id, nome_completo, status_conciliacao, tentativas_conciliacao")
      .eq("status_conciliacao", "revisao_manual")
      .order("nome_completo", { ascending: true })
      .limit(50);
    setRevisao((rev ?? []) as AutorRevisao[]);

    const { data: hist } = await (supabase as any)
      .from("integracoes_execucoes")
      .select("*")
      .eq("tipo_processo", "reprocessamento_autores")
      .order("iniciado_em", { ascending: false })
      .limit(10);
    setHistorico(hist ?? []);

    setLoadingResumo(false);
  }, []);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);

  const buscarAutores = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResultadosBusca([]);
      return;
    }
    const { data } = await (supabase as any)
      .from("autores")
      .select("id, nome_completo")
      .ilike("nome_completo", `%${q.trim()}%`)
      .order("nome_completo")
      .limit(8);
    setResultadosBusca(data ?? []);
  }, []);

  const executar = async (autorId?: string) => {
    setRunning(true);
    try {
      const body: any = autorId
        ? { autor_id: autorId }
        : { quantidade, status: statusFiltro };
      const { data, error } = await (supabase as any).functions.invoke("reprocessar-autores", { body });
      if (error) throw error;
      setExec({
        id: data.execucao_id,
        data: data.executado_em ?? new Date().toISOString(),
        processadas: data.processadas ?? 0,
        sucesso: data.sucesso ?? 0,
        revisao_manual: data.revisao_manual ?? 0,
        nao_encontrado: data.nao_encontrado ?? 0,
        erros: data.erros ?? 0,
        logs: data.logs ?? [],
      });
      toast({
        title: "Reprocessamento concluído",
        description: `${data.sucesso}/${data.processadas} conciliados · ${data.revisao_manual ?? 0} para revisão`,
      });
      carregarResumo();
    } catch (e: any) {
      toast({ title: "Erro no reprocessamento", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const toggleStatus = (s: string) => {
    setStatusFiltro((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Resumo de autores
            </CardTitle>
            <CardDescription>Status de conciliação com Wikidata</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={carregarResumo} disabled={loadingResumo}>
            <RefreshCcw className={`w-4 h-4 ${loadingResumo ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Metric label="Total" value={resumo?.total ?? 0} />
          <Metric label="Conciliados" value={resumo?.conciliado ?? 0} tone="good" />
          <Metric label="Pendentes" value={resumo?.pendente ?? 0} tone="warn" />
          <Metric label="Revisão manual" value={resumo?.revisao_manual ?? 0} tone="warn" />
          <Metric label="Não encontrados" value={resumo?.nao_encontrado ?? 0} tone="warn" />
        </CardContent>
      </Card>

      {/* Reprocessar autor específico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserSearch className="w-4 h-4" /> Reprocessar autor específico
          </CardTitle>
          <CardDescription>Busque por nome e execute a conciliação apenas para ele.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar autor pelo nome..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); buscarAutores(e.target.value); setAutorSelecionado(null); }}
            />
            <Button
              disabled={!autorSelecionado || running}
              onClick={() => autorSelecionado && executar(autorSelecionado.id)}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reprocessar"}
            </Button>
          </div>
          {resultadosBusca.length > 0 && !autorSelecionado && (
            <div className="border rounded-md divide-y bg-card">
              {resultadosBusca.map((a) => (
                <button
                  key={a.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onClick={() => { setAutorSelecionado(a); setBusca(a.nome_completo); setResultadosBusca([]); }}
                >
                  {a.nome_completo}
                </button>
              ))}
            </div>
          )}
          {autorSelecionado && (
            <p className="text-xs text-muted-foreground">
              Selecionado: <span className="font-medium text-foreground">{autorSelecionado.nome_completo}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reprocessar em lote */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reprocessar em lote</CardTitle>
          <CardDescription>Concilia autores filtrados por status. Fonte: Wikidata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <Select value={String(quantidade)} onValueChange={(v) => setQuantidade(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 10, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Filtrar por status</label>
              <div className="flex flex-wrap gap-3 pt-2">
                {STATUS_FILTROS.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={statusFiltro.includes(s.value)}
                      onCheckedChange={() => toggleStatus(s.value)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => executar()} disabled={running || statusFiltro.length === 0}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : `Processar ${quantidade}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado última execução */}
      {exec && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Resultados</CardTitle>
            <CardDescription>
              {new Date(exec.data).toLocaleString("pt-BR")} · Processados: {exec.processadas} · Conciliados: {exec.sucesso} · Revisão: {exec.revisao_manual} · Não encontrados: {exec.nao_encontrado} · Erros: {exec.erros}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Autor</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="hidden md:table-cell">Score</TableHead>
                  <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exec.logs.map((l) => (
                  <TableRow key={l.autor_id}>
                    <TableCell className="font-medium max-w-[260px] truncate">{l.nome}</TableCell>
                    <TableCell>{resultadoBadge(l.resultado)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{l.score ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{l.mensagem ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Aguardando revisão manual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aguardando revisão manual</CardTitle>
          <CardDescription>Autores com candidatos mas score abaixo do limite automático.</CardDescription>
        </CardHeader>
        <CardContent>
          {revisao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum autor aguardando revisão.</p>
          ) : (
            <div className="space-y-2">
              {revisao.map((a) => (
                <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium">{a.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      Tentativas: {a.tentativas_conciliacao}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setRevisaoAberta(a)}>
                    Revisar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de execuções</CardTitle>
          <CardDescription>Últimas 10 execuções de reprocessamento de autores.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado</TableHead>
                  <TableHead>Processado</TableHead>
                  <TableHead>Sucesso</TableHead>
                  <TableHead>Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.iniciado_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline">{h.status}</Badge></TableCell>
                    <TableCell>{h.quantidade_solicitada}</TableCell>
                    <TableCell>{h.quantidade_processada}</TableCell>
                    <TableCell>{h.quantidade_sucesso}</TableCell>
                    <TableCell>{h.quantidade_erro}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {revisaoAberta && (
        <RevisaoManualAutorDialog
          autor={revisaoAberta}
          open={!!revisaoAberta}
          onClose={(refresh) => {
            setRevisaoAberta(null);
            if (refresh) carregarResumo();
          }}
        />
      )}
    </div>
  );
};

const Metric = ({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" | "good"; }) => {
  const toneClass =
    tone === "warn" ? "text-destructive" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-primary";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value.toLocaleString("pt-BR")}</p>
    </div>
  );
};
