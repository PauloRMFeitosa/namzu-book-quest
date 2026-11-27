import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPainel } from "@/hooks/admin/useAdminPainel";
import { nomeDoEvento, type PainelDoAdmin } from "@/lib/adminPainel";
import { BarrasPorDia, Bloco, ErroDoPainel, SeletorDePeriodo } from "@/components/painel/PartesDoPainel";

// O caminho que um clube percorre até funcionar, na ordem em que acontece.
const FUNIL: { evento: string; rotulo: string }[] = [
  { evento: "clube_criado", rotulo: "Clubes criados" },
  { evento: "convite_gerado", rotulo: "Convites gerados" },
  { evento: "membro_entrou", rotulo: "Membros que entraram" },
  { evento: "cronograma_definido", rotulo: "Cronogramas definidos" },
  { evento: "encontro_criado", rotulo: "Encontros criados" },
  { evento: "progresso_registrado", rotulo: "Registros de progresso" },
];

const totalDe = (painel: PainelDoAdmin, evento: string) => painel.eventos_por_tipo.find((e) => e.evento === evento);

// Eventos de produto (tabela `eventos_produto`). Ver docs/metricas-produto.md.
export const MetricasTab = () => {
  const [dias, setDias] = useState(30);
  const { data: painel, isLoading, isFetching, refetch, error } = useAdminPainel(dias);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error || !painel) return <ErroDoPainel erro={error} />;

  const totalDeAcoes = painel.eventos_por_tipo.reduce((soma, e) => soma + e.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalDeAcoes.toLocaleString("pt-BR")} ações registradas nos últimos {painel.dias} dias. A medição começou em 25/11/2026.
        </p>
        <SeletorDePeriodo dias={dias} onMudar={setDias} atualizando={isFetching} onAtualizar={() => refetch()} />
      </div>

      <Bloco titulo="Ações por dia">
        <BarrasPorDia serie={painel.eventos_por_dia} rotulo="Ações por dia" />
      </Bloco>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Bloco titulo="Caminho do clube" descricao="Do clube criado até a leitura acontecer. Cada linha conta as ações do período.">
          <ol className="flex flex-col gap-2">
            {FUNIL.map((passo, i) => {
              const dado = totalDe(painel, passo.evento);
              return (
                <li key={passo.evento} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-muted text-xs font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 min-w-0">{passo.rotulo}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dado ? `${dado.clubes} ${dado.clubes === 1 ? "clube" : "clubes"}` : ""}
                  </span>
                  <span className="w-10 text-right tabular-nums font-medium">{dado?.total ?? 0}</span>
                </li>
              );
            })}
          </ol>
        </Bloco>

        <Bloco titulo="Todas as ações" descricao="Quantas vezes, em quantos clubes e por quantas pessoas.">
          {painel.eventos_por_tipo.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhuma ação registrada neste período.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="font-medium py-2 pr-3">Ação</th>
                    <th className="font-medium py-2 pr-3 text-right">Vezes</th>
                    <th className="font-medium py-2 pr-3 text-right">Clubes</th>
                    <th className="font-medium py-2 text-right">Pessoas</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.eventos_por_tipo.map((e) => (
                    <tr key={e.evento} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">{nomeDoEvento(e.evento)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium">{e.total}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{e.clubes}</td>
                      <td className="py-2 text-right tabular-nums">{e.pessoas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Bloco>
      </div>
    </div>
  );
};
