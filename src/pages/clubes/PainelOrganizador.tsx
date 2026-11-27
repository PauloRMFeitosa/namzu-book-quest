import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, CalendarDays, Globe, LayoutDashboard, Megaphone, Settings, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { ConvidarMembrosDialog } from "@/components/clubes/convite/ConvidarMembrosDialog";
import { EventosTab } from "@/components/clubes/eventos/EventosTab";
import { TrilhaGestao } from "@/components/clubes/gestao/TrilhaGestao";
import { MembrosTab } from "@/components/clubes/membros/MembrosTab";
import { ComunicacaoDoPainel } from "@/components/clubes/painel-organizador/ComunicacaoDoPainel";
import { ConfiguracoesDoPainel } from "@/components/clubes/painel-organizador/ConfiguracoesDoPainel";
import { PrimeirosPassos } from "@/components/clubes/painel-organizador/PrimeirosPassos";
import { PaginaPublicaDoPainel } from "@/components/clubes/painel-organizador/PaginaPublicaDoPainel";
import { VisaoDoPainel } from "@/components/clubes/painel-organizador/VisaoDoPainel";
import { CascaDoPainel, type GrupoDoPainel } from "@/components/painel/CascaDoPainel";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useAvisosClube } from "@/hooks/clubes/useAvisos";
import { usePermissoesClube } from "@/hooks/clubes/useClubeGestao";
import { useClubes } from "@/hooks/clubes/useClubes";
import { useHistoricoClube } from "@/hooks/clubes/useHistoricoClube";
import { usePlanoDoClube } from "@/hooks/clubes/usePlanoDoClube";
import { useMarcasDoRoteiro } from "@/hooks/clubes/useMarcasDoRoteiro";
import { useVisaoGeralClube } from "@/hooks/clubes/useVisaoGeralClube";
import { useVotacaoAberta } from "@/hooks/clubes/useVotacaoData";
import { useAuth } from "@/hooks/useAuth";
import { avisosPorSecao, pendenciasDoClube } from "@/lib/painelOrganizador";
import { avisoDeVagas } from "@/lib/planoDoClube";
import { passosDoRoteiro, progressoDoRoteiro, situacaoDoClube } from "@/lib/primeirosPassos";
import { registrarEvento } from "@/services/analytics";

// Painel do organizador (Fase 3): a área de gestão do clube, com tela própria
// e fora do layout do app. A página do clube fica para os membros. A seção
// aberta vai no endereço (?secao=).

const SECOES = [
  { chave: "visao", rotulo: "Visão geral", descricao: "Como o clube está e o que pede atenção.", icone: LayoutDashboard },
  { chave: "membros", rotulo: "Membros", descricao: "Quem faz parte, pedidos de entrada, papéis e convite.", icone: Users },
  { chave: "leitura", rotulo: "Leitura", descricao: "Trilha de livros, cronograma e metas.", icone: BookOpen },
  { chave: "encontros", rotulo: "Encontros", descricao: "Agenda, respostas, presença, atas e votação de data.", icone: CalendarDays },
  { chave: "comunicacao", rotulo: "Comunicação", descricao: "Avisos para todos os membros.", icone: Megaphone },
  { chave: "pagina", rotulo: "Página pública", descricao: "Endereço do clube e página aberta para divulgar.", icone: Globe },
  { chave: "configuracoes", rotulo: "Configurações", descricao: "Dados do clube e quem ajuda a organizar.", icone: Settings },
];

const PainelOrganizador = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const [busca, setBusca] = useSearchParams();
  const { user } = useAuth();
  const { clube, carregando, liberado } = useAcessoGestao(clubeId);
  const { podeNomear } = usePermissoesClube(clubeId, clube?.curador_id);
  const { data: visao } = useVisaoGeralClube(clubeId, liberado);
  const { data: historico } = useHistoricoClube(clubeId, liberado);
  const { data: votacao } = useVotacaoAberta(clubeId, liberado);
  const { data: todosOsClubes = [] } = useClubes();
  const [convidando, setConvidando] = useState(false);
  const { data: avisosEnviados } = useAvisosClube(clubeId, liberado);
  const { marcas, marcar } = useMarcasDoRoteiro(clubeId);
  const { data: planoDoClube } = usePlanoDoClube(clubeId, liberado);
  const vagas = avisoDeVagas(planoDoClube);

  const pedida = busca.get("secao") ?? "visao";
  const pendencias = useMemo(
    () => (visao ? pendenciasDoClube(visao, historico, { votacaoAberta: !!votacao }) : []),
    [visao, historico, votacao],
  );
  const avisos = avisosPorSecao(pendencias);
  const grupos: GrupoDoPainel[] = [{ rotulo: "Gestão do clube", secoes: SECOES.map((s) => ({ ...s, aviso: avisos[s.chave] })) }];
  const atual = grupos[0].secoes.find((s) => s.chave === pedida) ?? grupos[0].secoes[0];

  // Abrir a seção da página com ela no ar conta como "conheceu a página" no roteiro.
  const paginaNoAr = !!clube?.pagina_publica && !!clube?.endereco;
  useEffect(() => {
    if (pedida === "pagina" && paginaNoAr) marcar("pagina");
  }, [pedida, paginaNoAr, marcar]);

  useEffect(() => {
    if (!clube) return;
    document.title = `${atual.rotulo} · ${clube.nome}`;
    window.scrollTo({ top: 0 });
    return () => {
      document.title = "Namzu";
    };
  }, [atual.chave, atual.rotulo, clube]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <CarregandoCriacao />
      </div>
    );
  }
  if (!clube || !liberado) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const irPara = (chave: string) => {
    const proxima = new URLSearchParams(busca);
    proxima.set("secao", chave);
    setBusca(proxima);
  };

  // Roteiro "Primeiros passos": aparece na Visão geral até ficar completo ou ser dispensado.
  const recemCriado = busca.get("novo") === "1";
  const passos = passosDoRoteiro(
    clube.id,
    situacaoDoClube({
      livroAtual: visao?.livro_atual,
      temMeta: !!visao?.meta_atual,
      proximoEncontro: visao?.proximo_encontro,
      encontrosRealizados: historico?.encontros?.length,
      votacaoAberta: !!votacao,
      paginaNoAr,
      viuAPagina: marcas.pagina,
      membrosAtivos: visao?.membros_ativos,
      pedidosPendentes: visao?.pedidos_pendentes,
      gerouConvite: marcas.convite,
      avisos: avisosEnviados?.length,
    }),
  );
  // Só decide depois de os dados chegarem, para o roteiro não piscar em clube que já fez tudo.
  const mostrarRoteiro = !!visao && !marcas.dispensado && !progressoDoRoteiro(passos).completo;
  const dispensarRoteiro = () => {
    marcar("dispensado");
    registrarEvento("roteiro_dispensado", { clubeId: clube.id, props: { feitos: progressoDoRoteiro(passos).feitos } });
  };

  // Clubes que a pessoa organiza, para trocar sem sair do painel.
  const meusClubes = todosOsClubes.filter((c) => c.curador_id === user?.id || c.id === clube.id);
  const seletor =
    meusClubes.length > 1 ? (
      <div className="flex flex-col gap-1">
        <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Clube</span>
        <Select value={clube.id} onValueChange={(id) => navigate(`/clubes/${id}/painel?secao=${atual.chave}`)}>
          <SelectTrigger aria-label="Trocar de clube" className="h-10 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meusClubes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : (
      <p className="px-1 text-sm font-medium truncate" title={clube.nome}>
        {clube.nome}
      </p>
    );

  return (
    <CascaDoPainel
      marca="NAMZU"
      area="Organizador"
      rotuloDoMenu="Seções do painel do organizador"
      grupos={grupos}
      atual={atual}
      onIrPara={irPara}
      voltar={{ para: `/clubes/${clube.id}`, rotulo: "Voltar ao clube", rotuloCurto: "Clube" }}
      chaveDoMenu="painel-organizador-menu-recolhido"
      topoDoMenu={seletor}
    >
      {atual.chave === "visao" && (
        <VisaoDoPainel
          clubeId={clube.id}
          nomeClube={clube.nome}
          visao={visao}
          historico={historico}
          pendencias={pendencias}
          onIrPara={irPara}
          roteiro={
            mostrarRoteiro ? (
              <PrimeirosPassos
                nomeClube={clube.nome}
                passos={passos}
                recemCriado={recemCriado}
                onIrPara={irPara}
                onConvidar={() => setConvidando(true)}
                onDispensar={dispensarRoteiro}
              />
            ) : undefined
          }
        />
      )}

      {atual.chave === "membros" && (
        <div className="flex flex-col gap-4 max-w-5xl">
          {vagas && (
            <p
              role={vagas.cheio ? "alert" : "status"}
              className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 px-4 py-3 text-sm"
            >
              {vagas.texto}
            </p>
          )}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setConvidando(true)}>
              <UserPlus className="w-4 h-4" /> Convidar membros
            </Button>
          </div>
          <MembrosTab
            clubeId={clube.id}
            curadorId={clube.curador_id}
            isMembro
            nomeClube={clube.nome}
            pulso={{ membros: clube.membros_count, ativos7d: clube.ativos_7d, ativos30d: clube.ativos_30d }}
          />
        </div>
      )}

      {atual.chave === "leitura" && (
        <div className="max-w-4xl">
          <TrilhaGestao clubeId={clube.id} />
        </div>
      )}

      {atual.chave === "encontros" && (
        <div className="max-w-4xl">
          <EventosTab clubeId={clube.id} curadorId={clube.curador_id} isMembro nomeClube={clube.nome} />
        </div>
      )}

      {atual.chave === "comunicacao" && <ComunicacaoDoPainel clubeId={clube.id} nomeClube={clube.nome} />}

      {atual.chave === "pagina" && (
        <PaginaPublicaDoPainel key={clube.id} clube={clube} podeEditar={podeNomear} onConvidar={() => setConvidando(true)} />
      )}

      {atual.chave === "configuracoes" && (
        <ConfiguracoesDoPainel
          clube={clube}
          podeEditar={podeNomear}
          onIrPara={irPara}
          roteiroDispensado={marcas.dispensado}
          onReabrirRoteiro={() => {
            marcar("dispensado", false);
            irPara("visao");
          }}
        />
      )}

      <ConvidarMembrosDialog
        open={convidando}
        onOpenChange={setConvidando}
        clubeId={clube.id}
        nomeClube={clube.nome}
        privado={clube.visibilidade === "privado"}
        enderecoDaPagina={paginaNoAr ? clube.endereco : null}
      />
    </CascaDoPainel>
  );
};

export default PainelOrganizador;
