import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BookOpen, Building2, CalendarDays, CheckCircle2, UserCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPainel } from "@/hooks/admin/useAdminPainel";
import { haQuantoTempo, nomeDoEvento, pendenciasDoPainel, situacaoDoClube } from "@/lib/adminPainel";
import { quandoDoEncontro } from "@/lib/encontros";
import { BarrasPorDia, Bloco, ErroDoPainel, Indicador, SeletorDePeriodo, SeloDaSituacao } from "../components/AdminPainelPartes";

// Tela inicial do Admin: o que está acontecendo no produto e o que pede atenção.
export const PainelTab = ({ onIrPara }: { onIrPara: (secao: string) => void }) => {
  const [dias, setDias] = useState(14);
  const { data: painel, isLoading, isFetching, refetch, error } = useAdminPainel(dias);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (error || !painel) return <ErroDoPainel erro={error} />;

  const t = painel.totais;
  const pendencias = pendenciasDoPainel(painel);
  const clubesAtivos = painel.clubes.filter((c) => c.ativo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Visão do produto nos últimos {painel.dias} dias.</p>
        <SeletorDePeriodo dias={dias} onMudar={setDias} atualizando={isFetching} onAtualizar={() => refetch()} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Indicador rotulo="Usuários" valor={t.usuarios} detalhe={`${t.usuarios_novos} novos no período`} icone={Users} />
        <Indicador rotulo="Ativos (7 dias)" valor={t.usuarios_ativos_7d} detalhe="Entraram ou fizeram alguma ação" icone={UserCheck} />
        <Indicador rotulo="Clubes ativos" valor={t.clubes_ativos} detalhe={`${t.clubes_com_atividade_7d} com ação em 7 dias`} icone={Building2} />
        <Indicador rotulo="Membros" valor={t.membros_ativos} detalhe={`${t.pedidos_pendentes} pedidos pendentes`} icone={UserPlus} />
        <Indicador rotulo="Encontros" valor={t.encontros_proximos} detalhe="Marcados daqui para a frente" icone={CalendarDays} />
        <Indicador rotulo="Acervo" valor={t.obras} detalhe="Obras cadastradas" icone={BookOpen} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Bloco titulo="Ações por dia" descricao="Tudo o que organizadores e membros fizeram nos clubes." className="xl:col-span-2">
          <BarrasPorDia serie={painel.eventos_por_dia} rotulo="Ações por dia" />
        </Bloco>

        <Bloco titulo="Precisa de atenção">
          {pendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Nada pendente agora.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {pendencias.map((p) => (
                <li key={p.texto}>
                  <button
                    type="button"
                    onClick={() => onIrPara(p.secao)}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">{p.texto}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Bloco
          titulo="Clubes"
          descricao={`${clubesAtivos.length} ativos. Do mais recente em atividade para o mais parado.`}
          className="xl:col-span-2"
          acao={
            <Button variant="outline" size="sm" onClick={() => onIrPara("clubes")}>
              Ver todos
            </Button>
          }
        >
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="font-medium py-2 pr-3">Clube</th>
                  <th className="font-medium py-2 pr-3">Situação</th>
                  <th className="font-medium py-2 pr-3 text-right">Membros</th>
                  <th className="font-medium py-2 pr-3 text-right">Ações</th>
                  <th className="font-medium py-2 pr-3">Última ação</th>
                  <th className="font-medium py-2">Próximo encontro</th>
                </tr>
              </thead>
              <tbody>
                {clubesAtivos.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <Link to={`/clubes/${c.id}`} className="font-medium hover:underline">
                        {c.nome}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.organizador ?? "Sem organizador"}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <SeloDaSituacao situacao={situacaoDoClube(c)} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.membros}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.acoes_no_periodo}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{haQuantoTempo(c.ultima_atividade)}</td>
                    <td className="py-2 text-muted-foreground">{c.proximo_encontro ? quandoDoEncontro(c.proximo_encontro) : "Nenhum"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloco>

        <Bloco
          titulo="O que mais foi usado"
          descricao={`Nos últimos ${painel.dias} dias.`}
          acao={
            <Button variant="outline" size="sm" onClick={() => onIrPara("metricas")}>
              Métricas
            </Button>
          }
        >
          {painel.eventos_por_tipo.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhuma ação registrada neste período.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {painel.eventos_por_tipo.slice(0, 8).map((e) => (
                <li key={e.evento} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{nomeDoEvento(e.evento)}</span>
                  <span className="tabular-nums font-medium">{e.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>
    </div>
  );
};
