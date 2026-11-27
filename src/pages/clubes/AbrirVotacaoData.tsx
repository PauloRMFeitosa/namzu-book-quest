import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useAbrirVotacao } from "@/hooks/clubes/useVotacaoData";
import { useRascunho } from "@/hooks/useRascunho";
import { VOTACAO_VAZIA, escreverDatasDaVotacao, lerDatasDaVotacao } from "@/lib/criacao";
import { quandoDoEncontro } from "@/lib/encontros";
import { MAXIMO_OPCOES, MINIMO_OPCOES, opcoesParaEnvio, validarVotacao } from "@/lib/votacaoData";

const draftKey = (clubeId: string) => `draft-votacao-data-${clubeId}`;

// Organizador propõe as datas do próximo encontro (Fase 3).
const AbrirVotacaoData = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}/painel?secao=encontros`;
  const { clube, carregando, liberado } = useAcessoGestao(clubeId);
  const { dados, mudar, limpar } = useRascunho(draftKey(clubeId), VOTACAO_VAZIA);
  const abrir = useAbrirVotacao(clubeId);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  if (carregando) return <CarregandoCriacao />;
  if (!liberado) return <Navigate to={`/clubes/${clubeId}`} replace />;

  // O rascunho antigo, da janela, guardava as datas em lista; aqui é texto.
  const lidas = lerDatasDaVotacao(typeof dados.datas === "string" ? dados.datas : "|").slice(0, MAXIMO_OPCOES);
  const datas = lidas.length >= MINIMO_OPCOES ? lidas : [...lidas, ...Array(MINIMO_OPCOES - lidas.length).fill("")];
  const mudarDatas = (novas: string[]) => mudar({ datas: escreverDatasDaVotacao(novas) });
  const erro = validarVotacao(dados.titulo, datas);
  const propostas = opcoesParaEnvio(datas);

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await abrir.mutateAsync({ titulo: dados.titulo, opcoes: propostas, urlEvento: dados.url });
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    limpar();
    navigate(voltarPara);
  };

  return (
    <PaginaCriacao
      titulo="Votar a data do encontro"
      subtitulo={clube?.nome}
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para os encontros do painel"
    >
      <SecaoCriacao titulo="1. O encontro">
        <div className="grid gap-1.5">
          <Label htmlFor="votacao-titulo">Nome do encontro</Label>
          <Input
            id="votacao-titulo"
            maxLength={120}
            placeholder="Ex.: Conversa sobre o livro do mês"
            value={dados.titulo}
            onChange={(e) => mudar({ titulo: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="votacao-url">Link da chamada (opcional)</Label>
          <Input
            id="votacao-url"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={dados.url}
            onChange={(e) => mudar({ url: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao
        titulo="2. Datas propostas"
        descricao={`De ${MINIMO_OPCOES} a ${MAXIMO_OPCOES} datas. Os membros marcam quando podem e você escolhe uma para marcar o encontro.`}
      >
        <div className="flex flex-col gap-2">
          {datas.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="datetime-local"
                aria-label={`Data ${i + 1}`}
                value={d}
                onChange={(e) => mudarDatas(datas.map((atual, j) => (j === i ? e.target.value : atual)))}
                className="h-11 rounded-xl min-w-0"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11 shrink-0 text-destructive hover:text-destructive"
                aria-label={`Remover data ${i + 1}`}
                disabled={datas.length <= MINIMO_OPCOES}
                onClick={() => mudarDatas(datas.filter((_, j) => j !== i))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl gap-1.5 self-start"
            disabled={datas.length >= MAXIMO_OPCOES}
            onClick={() => mudarDatas([...datas, ""])}
          >
            <Plus className="w-4 h-4" /> Adicionar data
          </Button>
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como os membros vão ver">
        <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-2" aria-label="Prévia da votação">
          <p className="font-semibold leading-snug break-words">{dados.titulo.trim() || "Nome do encontro"}</p>
          {propostas.length === 0 ? (
            <p className="text-sm text-muted-foreground">As datas propostas aparecem aqui.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {propostas.map((p) => (
                <li key={p} className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 shrink-0" /> {quandoDoEncontro(p)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={voltarPara}>
        <Button onClick={salvar} disabled={abrir.isPending} className="rounded-xl">
          {abrir.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Abrir votação"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default AbrirVotacaoData;
