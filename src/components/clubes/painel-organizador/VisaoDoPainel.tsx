import { AlertTriangle, ArrowRight, BookOpen, CalendarCheck, CheckCircle2, UserCheck, UserX, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VisaoGeralTab } from "@/components/clubes/gestao/VisaoGeralTab";
import { BarrasPorDia, Bloco, Indicador } from "@/components/painel/PartesDoPainel";
import { quandoDoEncontro } from "@/lib/encontros";
import {
  participacaoDaSemana,
  serieDeParticipacao,
  textoDaPresenca,
  type HistoricoDoClube,
  type PendenciaDoClube,
} from "@/lib/painelOrganizador";
import { resumoLeitura, type VisaoGeralClube } from "@/lib/visaoGeral";

interface Props {
  clubeId: string;
  nomeClube: string;
  visao: VisaoGeralClube | undefined;
  historico: HistoricoDoClube | undefined;
  pendencias: PendenciaDoClube[];
  onIrPara: (secao: string) => void;
}

// Abas antigas do clube → seções do painel, para os atalhos da visão geral.
const SECAO_DA_ABA: Record<string, string> = { membros: "membros", eventos: "encontros", gestao: "leitura", leituras: "leitura" };

// Primeira tela do painel do organizador: números, o que pede atenção, o
// acompanhamento de cada membro e como o clube andou nas últimas semanas.
export const VisaoDoPainel = ({ clubeId, nomeClube, visao, historico, pendencias, onIrPara }: Props) => {
  const leitura = resumoLeitura(visao?.membros ?? []);
  const participacao = participacaoDaSemana(historico);
  const encontros = [...(historico?.encontros ?? [])].reverse();

  return (
    <div className="flex flex-col gap-4">
      {visao ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Indicador
            rotulo="Membros"
            valor={visao.membros_ativos}
            detalhe={visao.pedidos_pendentes > 0 ? `${visao.pedidos_pendentes} pedindo para entrar` : "Ativos no clube"}
            icone={Users}
          />
          <Indicador
            rotulo="Lendo o livro"
            valor={leitura.lendo + leitura.concluido}
            detalhe={visao.livro_atual ? `${leitura.concluido} já concluíram` : "Sem livro na trilha"}
            icone={BookOpen}
          />
          <Indicador
            rotulo="Parados"
            valor={visao.parados}
            detalhe="Sem atividade há 7 dias"
            icone={UserX}
          />
          <Indicador
            rotulo="Participação"
            valor={participacao ?? 0}
            sufixo="%"
            detalhe={participacao === null ? "Sem dados desta semana" : "Dos membros, nesta semana"}
            icone={UserCheck}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="flex flex-col gap-4 xl:order-2 min-w-0">
          <Bloco titulo="Precisa de atenção">
            {!visao ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : pendencias.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> O clube está em dia.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {pendencias.map((p) => (
                  <li key={p.texto}>
                    <button
                      type="button"
                      onClick={() => onIrPara(p.secao)}
                      className="w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block">{p.texto}</span>
                        <span className="block text-xs text-muted-foreground">{p.acao}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>

          <Bloco titulo="Participação por semana" descricao="Quantas pessoas leram ou conversaram no clube em cada semana.">
            <BarrasPorDia serie={serieDeParticipacao(historico)} rotulo="Pessoas que participaram por semana" />
          </Bloco>

          <Bloco titulo="Últimos encontros">
            {encontros.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum encontro realizado ainda.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {encontros.slice(0, 5).map((e) => (
                  <li key={e.id} className="py-2 flex items-start gap-2 text-sm">
                    <CalendarCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{e.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {quandoDoEncontro(e.inicio_em)} · {textoDaPresenca(e)} · {e.tem_ata ? "com ata" : "sem ata"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        </div>

        <div className="xl:col-span-2 xl:order-1 min-w-0">
          <VisaoGeralTab clubeId={clubeId} nomeClube={nomeClube} onIrPara={(aba) => onIrPara(SECAO_DA_ABA[aba] ?? "visao")} />
        </div>
      </div>
    </div>
  );
};
