import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Hash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useCanais, useCriarCanal } from "@/hooks/clubes/useCanais";
import { useRascunho } from "@/hooks/useRascunho";
import { CANAL_VAZIO, MAXIMO_NOME_CANAL, montarCanal, normalizarNomeCanal, validarNovoCanal } from "@/lib/criacao";

const draftKey = (clubeId: string) => `draft-canal-${clubeId}`;

const CriarCanal = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}?tab=canais`;
  const { clube, carregando, liberado } = useAcessoGestao(clubeId);
  const { data: canais } = useCanais(liberado ? clubeId : undefined);
  const { dados, mudar, limpar } = useRascunho(draftKey(clubeId), CANAL_VAZIO);
  const criar = useCriarCanal(clubeId);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  if (carregando) return <CarregandoCriacao />;
  if (!liberado) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const erro = validarNovoCanal(dados, (canais ?? []).map((c) => c.nome));
  const canal = montarCanal(dados);

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await criar.mutateAsync(canal);
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    limpar();
    navigate(voltarPara);
  };

  return (
    <PaginaCriacao
      titulo="Novo canal"
      subtitulo={clube?.nome}
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para os canais do clube"
    >
      <SecaoCriacao titulo="1. O canal" descricao="Um espaço de conversa por assunto. Todos os membros do clube participam.">
        <div className="grid gap-1.5">
          <Label htmlFor="canal-nome">Nome</Label>
          <Input
            id="canal-nome"
            value={dados.nome}
            maxLength={MAXIMO_NOME_CANAL}
            onChange={(e) => mudar({ nome: normalizarNomeCanal(e.target.value) })}
            placeholder="discussao-geral"
            autoCapitalize="none"
            className="h-11 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">Letras minúsculas, números e hífen. Espaços viram hífen.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="canal-descricao">Descrição (opcional)</Label>
          <Textarea
            id="canal-descricao"
            rows={3}
            maxLength={200}
            value={dados.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
            placeholder="Sobre o que é este canal?"
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como vai aparecer">
        <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-3" aria-label="Prévia do canal">
          <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4 text-accent" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{canal.nome || "nome-do-canal"}</p>
            {canal.descricao && <p className="text-xs text-muted-foreground truncate">{canal.descricao}</p>}
          </div>
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={voltarPara}>
        <Button onClick={salvar} disabled={criar.isPending} className="rounded-xl">
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar canal"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default CriarCanal;
