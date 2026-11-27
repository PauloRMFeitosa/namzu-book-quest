import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useEnviarAviso } from "@/hooks/clubes/useAvisos";
import { useRascunho } from "@/hooks/useRascunho";
import { MAXIMO_MENSAGEM_AVISO, MAXIMO_TITULO_AVISO, resumoDoAviso, validarAviso } from "@/lib/avisos";
import { AVISO_VAZIO } from "@/lib/criacao";

const draftKey = (clubeId: string) => `draft-aviso-${clubeId}`;

// Organizador escreve um aviso para todos os membros do clube (Fase 3).
const CriarAviso = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}/painel?secao=comunicacao`;
  const { clube, carregando, liberado } = useAcessoGestao(clubeId);
  const { dados, mudar, limpar } = useRascunho(draftKey(clubeId), AVISO_VAZIO);
  const enviar = useEnviarAviso(clubeId);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  if (carregando) return <CarregandoCriacao />;
  if (!liberado) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const erro = validarAviso(dados.titulo, dados.mensagem);

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await enviar.mutateAsync({ titulo: dados.titulo, mensagem: dados.mensagem });
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    limpar();
    navigate(voltarPara);
  };

  return (
    <PaginaCriacao titulo="Novo aviso" subtitulo={clube?.nome} voltarPara={voltarPara} rotuloVoltar="Voltar para o painel">
      <SecaoCriacao
        titulo="1. O aviso"
        descricao="Todos os membros ativos recebem uma notificação no app. O aviso também fica guardado no clube."
      >
        <div className="grid gap-1.5">
          <Label htmlFor="aviso-titulo">Título</Label>
          <Input
            id="aviso-titulo"
            maxLength={MAXIMO_TITULO_AVISO}
            placeholder="Ex.: Mudança de horário"
            value={dados.titulo}
            onChange={(e) => mudar({ titulo: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="aviso-mensagem">Mensagem</Label>
          <Textarea
            id="aviso-mensagem"
            rows={7}
            value={dados.mensagem}
            onChange={(e) => mudar({ mensagem: e.target.value })}
            placeholder="O que os membros precisam saber?"
          />
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {dados.mensagem.trim().length.toLocaleString("pt-BR")} de {MAXIMO_MENSAGEM_AVISO.toLocaleString("pt-BR")}
          </p>
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como a notificação vai aparecer">
        <div className="rounded-xl bg-muted/50 p-3 flex items-start gap-3" aria-label="Prévia do aviso">
          <Bell className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Aviso de {clube?.nome}</p>
            <p className="font-semibold text-sm break-words">{dados.titulo.trim() || "Título do aviso"}</p>
            <p className="text-sm text-muted-foreground break-words">
              {dados.mensagem.trim() ? resumoDoAviso(dados.mensagem) : "As primeiras linhas da mensagem aparecem aqui."}
            </p>
          </div>
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={voltarPara}>
        <Button onClick={salvar} disabled={enviar.isPending} className="rounded-xl">
          {enviar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar aviso"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default CriarAviso;
