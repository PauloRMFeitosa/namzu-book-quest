import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, ChevronDown, ChevronRight, Activity, Shield, Star, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Execucao = {
  id: string;
  tipo_processo: string;
  fonte: string;
  quantidade_solicitada: number;
  quantidade_processada: number;
  quantidade_sucesso: number;
  quantidade_erro: number;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
};

type ExecucaoItem = {
  id: string;
  tipo_entidade: string;
  nome_referencia: string;
  status: string;
  mensagem: string | null;
  processado_em: string;
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  reprocessamento_autores: "Reprocessamento · Autores",
  reprocessamento_generos: "Reprocessamento · Gêneros",
};

const tipoLabel = (t: string) => TIPO_LABEL[t] ?? t;

const duracao = (ini: string, fim: string | null) => {
  if (!fim) return "—";
  const s = Math.round((new Date(fim).getTime() - new Date(ini).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const tempoRelativo = (dt: string) => {
  const s = Math.round((Date.now() - new Date(dt).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)}min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `há ${Math.floor(s / 86400)}d`;
  return new Date(dt).toLocaleDateString("pt-BR");
};

const fmtDt = (dt: string) =>
  new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

// ─── Badges ──────────────────────────────────────────────────────────────────

const statusBadge = (s: string) => {
  const styles: Record<string, string> = {
    concluido: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    em_andamento: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    erro: "bg-destructive/15 text-destructive",
  };
  return <Badge className={styles[s] ?? "bg-muted text-muted-foreground"}>{s}</Badge>;
};

const itemStatusBadge = (s: string) => {
  const styles: Record<string, string> = {
    sucesso: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    revisao_manual: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    nao_encontrado: "bg-muted text-muted-foreground",
    erro: "bg-destructive/15 text-destructive",
  };
  return <Badge className={styles[s] ?? "bg-muted text-muted-foreground"}>{s}</Badge>;
};

// ─── JobsSection ─────────────────────────────────────────────────────────────

const JobsSection = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, ExecucaoItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);

  const { data: execucoes = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-jobs-execucoes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("integracoes_execucoes")
        .select("*")
        .order("iniciado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Execucao[];
    },
  });

  // Agrupa por tipo para os cards de resumo
  const byTipo = execucoes.reduce<Record<string, Execucao[]>>((acc, e) => {
    if (!acc[e.tipo_processo]) acc[e.tipo_processo] = [];
    acc[e.tipo_processo].push(e);
    return acc;
  }, {});

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (itemsCache[id] !== undefined) return;
    setLoadingItems(id);
    const { data } = await (supabase as any)
      .from("integracoes_execucoes_itens")
      .select("id, tipo_entidade, nome_referencia, status, mensagem, processado_em")
      .eq("execucao_id", id)
      .order("processado_em", { ascending: true })
      .limit(500);
    setItemsCache((prev) => ({ ...prev, [id]: (data ?? []) as ExecucaoItem[] }));
    setLoadingItems(null);
  };

  return (
    <div className="space-y-4">
      {/* Cards de resumo por tipo */}
      {Object.keys(byTipo).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byTipo).map(([tipo, runs]) => {
            const last = runs[0];
            const totalSucesso = runs.reduce((s, r) => s + r.quantidade_sucesso, 0);
            const totalProcessado = runs.reduce((s, r) => s + r.quantidade_processada, 0);
            const taxa = totalProcessado > 0 ? Math.round((totalSucesso / totalProcessado) * 100) : 0;
            const taxaCor =
              taxa >= 70 ? "text-emerald-600 dark:text-emerald-400"
              : taxa >= 40 ? "text-amber-600 dark:text-amber-400"
              : "text-destructive";
            return (
              <Card key={tipo}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{tipoLabel(tipo)}</CardTitle>
                  <CardDescription className="text-xs">
                    {runs.length} execuç{runs.length === 1 ? "ão" : "ões"} · fonte: {last.fonte}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Última execução</p>
                    <p className="font-semibold" title={fmtDt(last.iniciado_em)}>{tempoRelativo(last.iniciado_em)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa de sucesso</p>
                    <p className={`font-semibold ${taxaCor}`}>{taxa}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total processado</p>
                    <p className="font-semibold">{totalProcessado.toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último status</p>
                    {statusBadge(last.status)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabela histórico completo */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> Histórico de execuções
            </CardTitle>
            <CardDescription>Últimas 200 execuções registradas em banco</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {execucoes.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Nenhuma execução registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6" />
                  <TableHead>Iniciado em</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Solicitadas</TableHead>
                  <TableHead className="text-right">Processadas</TableHead>
                  <TableHead className="text-right text-emerald-700">Sucesso</TableHead>
                  <TableHead className="text-right text-destructive">Erros</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execucoes.map((e) => (
                  <Fragment key={e.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => toggleExpand(e.id)}
                    >
                      <TableCell className="pr-0 pl-3">
                        {expanded === e.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className="font-medium" title={fmtDt(e.iniciado_em)}>
                          {tempoRelativo(e.iniciado_em)}
                        </span>
                        <br />
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(e.iniciado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{tipoLabel(e.tipo_processo)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.fonte}</TableCell>
                      <TableCell className="text-right text-xs">{e.quantidade_solicitada}</TableCell>
                      <TableCell className="text-right text-xs">{e.quantidade_processada}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {e.quantidade_sucesso}
                      </TableCell>
                      <TableCell className="text-right text-xs text-destructive font-medium">
                        {e.quantidade_erro > 0 ? e.quantidade_erro : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {duracao(e.iniciado_em, e.finalizado_em)}
                      </TableCell>
                      <TableCell>{statusBadge(e.status)}</TableCell>
                    </TableRow>

                    {expanded === e.id && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="py-3 px-6">
                          {loadingItems === e.id ? (
                            <p className="text-xs text-muted-foreground">Carregando itens…</p>
                          ) : (itemsCache[e.id] ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                              Nenhum item detalhado persistido para esta execução.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Tipo</TableHead>
                                  <TableHead className="text-xs">Nome</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                  <TableHead className="text-xs">Mensagem</TableHead>
                                  <TableHead className="text-xs">Processado em</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(itemsCache[e.id] ?? []).map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs text-muted-foreground">{item.tipo_entidade}</TableCell>
                                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{item.nome_referencia}</TableCell>
                                    <TableCell>{itemStatusBadge(item.status)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                                      {item.mensagem ?? "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                      {fmtDt(item.processado_em)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── LogsSection ─────────────────────────────────────────────────────────────

const LogsSection = () => {
  const { data: modLogs = [], isLoading: loadingMod, refetch: refetchMod } = useQuery({
    queryKey: ["admin-logs-moderacao"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("moderacao_logs")
        .select("id, moderador_id, acao, entidade_tipo, entidade_id, motivo, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: xpLogs = [], isLoading: loadingXp, refetch: refetchXp } = useQuery({
    queryKey: ["admin-logs-xp"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("gamificacao_xp_log")
        .select("id, user_id, acao, xp_ganho, clube_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: repLogs = [], isLoading: loadingRep, refetch: refetchRep } = useQuery({
    queryKey: ["admin-logs-reputacao"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("reputacao_logs")
        .select("id, user_id, origem, score, referencia_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <Tabs defaultValue="moderacao">
      <TabsList className="mb-4">
        <TabsTrigger value="moderacao" className="gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Moderação
          {modLogs.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{modLogs.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="xp" className="gap-1.5">
          <Zap className="w-3.5 h-3.5" /> XP
          {xpLogs.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{xpLogs.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="reputacao" className="gap-1.5">
          <Star className="w-3.5 h-3.5" /> Reputação
          {repLogs.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{repLogs.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="moderacao">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> Logs de moderação
              </CardTitle>
              <CardDescription>Últimas 100 ações de moderadores</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchMod()} disabled={loadingMod}>
              <RefreshCcw className={`w-4 h-4 ${loadingMod ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {modLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">Nenhum log de moderação registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(modLogs as any[]).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {tempoRelativo(l.created_at)}
                        <br />
                        <span className="text-[10px]">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{l.acao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.entidade_tipo ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{l.motivo ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="xp">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" /> Log de XP
              </CardTitle>
              <CardDescription>Últimas 100 atribuições de XP de gamificação</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchXp()} disabled={loadingXp}>
              <RefreshCcw className={`w-4 h-4 ${loadingXp ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {xpLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">Nenhum log de XP registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead className="text-right">XP</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(xpLogs as any[]).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {tempoRelativo(l.created_at)}
                        <br />
                        <span className="text-[10px]">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{l.acao}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        +{l.xp_ganho}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">{l.user_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reputacao">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4" /> Log de reputação
              </CardTitle>
              <CardDescription>Últimas 100 alterações de score de reputação</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchRep()} disabled={loadingRep}>
              <RefreshCcw className={`w-4 h-4 ${loadingRep ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {repLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">Nenhum log de reputação registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(repLogs as any[]).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {tempoRelativo(l.created_at)}
                        <br />
                        <span className="text-[10px]">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{l.origem}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{Number(l.score).toFixed(2)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">{l.user_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

// ─── JobsTab (root) ───────────────────────────────────────────────────────────

export const JobsTab = () => {
  return (
    <Tabs defaultValue="jobs">
      <TabsList className="mb-6">
        <TabsTrigger value="jobs" className="gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Jobs
        </TabsTrigger>
        <TabsTrigger value="logs" className="gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Logs do sistema
        </TabsTrigger>
      </TabsList>
      <TabsContent value="jobs">
        <JobsSection />
      </TabsContent>
      <TabsContent value="logs">
        <LogsSection />
      </TabsContent>
    </Tabs>
  );
};
