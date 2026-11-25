import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bug, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/constants/queryKeys";
import { ROTULO_DA_ORIGEM, agruparErros, type ErroRegistrado } from "@/lib/monitoramento";
import { cn } from "@/lib/utils";

// Erros que o app encontrou no navegador das pessoas (tabela `erros_app`),
// agrupados por assinatura. Ver docs/monitoramento.md.

const PERIODOS = [
  { dias: 1, label: "Hoje e ontem" },
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
];

const LIMITE = 1000;

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const ErrosAppTab = () => {
  const [dias, setDias] = useState(7);
  const [ambiente, setAmbiente] = useState<"producao" | "preview">("producao");
  const [aberto, setAberto] = useState<string | null>(null);

  const { data: erros = [], isLoading, isFetching, refetch, error } = useQuery({
    queryKey: queryKeys.admin.errosApp(dias),
    staleTime: 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<ErroRegistrado[]> => {
      const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("erros_app")
        .select("id, criado_em, user_id, origem, assinatura, mensagem, pilha, rota, versao, ambiente, navegador")
        .gte("criado_em", desde)
        .order("criado_em", { ascending: false })
        .limit(LIMITE);
      if (error) throw error;
      return (data ?? []) as ErroRegistrado[];
    },
  });

  const doAmbiente = erros.filter((e) => e.ambiente === ambiente);
  const grupos = agruparErros(doAmbiente);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Bug className="w-5 h-5" /> Erros do app
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Erros que o app encontrou no navegador de quem estava logado. Ocorrências iguais ficam juntas. Os registros
            somem depois de 30 dias.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Atualizar
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Button
            key={p.dias}
            size="sm"
            variant={dias === p.dias ? "default" : "outline"}
            className="rounded-xl"
            aria-pressed={dias === p.dias}
            onClick={() => setDias(p.dias)}
          >
            {p.label}
          </Button>
        ))}
        <span className="w-px bg-border mx-1" />
        {(["producao", "preview"] as const).map((a) => (
          <Button
            key={a}
            size="sm"
            variant={ambiente === a ? "default" : "outline"}
            className="rounded-xl"
            aria-pressed={ambiente === a}
            onClick={() => setAmbiente(a)}
          >
            {a === "producao" ? "Produção" : "Preview"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar os erros: {(error as { message?: string }).message ?? "erro desconhecido"}
        </p>
      ) : grupos.length === 0 ? (
        <div className="card-soft p-8 text-center text-sm text-muted-foreground">
          Nenhum erro registrado neste período.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {grupos.length === 1 ? "1 erro diferente" : `${grupos.length} erros diferentes`}, {doAmbiente.length}{" "}
            {doAmbiente.length === 1 ? "ocorrência" : "ocorrências"}
            {erros.length >= LIMITE ? ` (mostrando as ${LIMITE} mais recentes)` : ""}.
          </p>
          <ul className="flex flex-col gap-2">
            {grupos.map((g) => {
              const expandido = aberto === g.assinatura;
              return (
                <li key={g.assinatura} className="rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    aria-expanded={expandido}
                    onClick={() => setAberto(expandido ? null : g.assinatura)}
                    className="w-full text-left p-3 flex items-start gap-2"
                  >
                    {expandido ? <ChevronDown className="w-4 h-4 mt-1 shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 shrink-0" />}
                    <span className="min-w-0 flex-1 flex flex-col gap-1">
                      <span className="font-medium break-words">{g.mensagem}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <Badge variant="outline">{ROTULO_DA_ORIGEM[g.origem] ?? g.origem}</Badge>
                        <span>
                          {g.ocorrencias} {g.ocorrencias === 1 ? "vez" : "vezes"}
                        </span>
                        <span>
                          {g.pessoas} {g.pessoas === 1 ? "pessoa" : "pessoas"}
                        </span>
                        <span>última: {quando(g.ultima)}</span>
                      </span>
                    </span>
                  </button>
                  {expandido && (
                    <div className="border-t border-border p-3 flex flex-col gap-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Primeira vez:</span> {quando(g.primeira)}
                      </p>
                      <p className="break-words">
                        <span className="text-muted-foreground">Telas:</span> {g.rotas.join(", ") || "não informada"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Versões:</span> {g.versoes.join(", ") || "não informada"}
                      </p>
                      <p className="break-words">
                        <span className="text-muted-foreground">Navegador (última vez):</span>{" "}
                        {g.exemplo.navegador ?? "não informado"}
                      </p>
                      {g.exemplo.pilha ? (
                        <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-72 whitespace-pre-wrap break-words">
                          {g.exemplo.pilha}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground">Sem pilha de execução.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
