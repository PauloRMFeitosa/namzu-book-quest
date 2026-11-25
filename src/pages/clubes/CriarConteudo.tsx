import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Clock, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useConteudos, useCriarConteudo } from "@/hooks/clubes/useConteudos";
import { useRascunho } from "@/hooks/useRascunho";
import {
  CONTEUDO_VAZIO,
  TIPOS_DE_CONTEUDO,
  explicarLiberacao,
  montarConteudo,
  validarNovoConteudo,
} from "@/lib/criacao";

const draftKey = (clubeId: string) => `draft-conteudo-${clubeId}`;

const CriarConteudo = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}?tab=conteudos`;
  const { clube, carregando, liberado } = useAcessoGestao(clubeId);
  const { data: conteudos } = useConteudos(liberado ? clubeId : undefined);
  const { dados, mudar, limpar } = useRascunho(draftKey(clubeId), CONTEUDO_VAZIO);
  const criar = useCriarConteudo(clubeId);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  if (carregando) return <CarregandoCriacao />;
  if (!liberado) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const erro = validarNovoConteudo(dados);
  const proximaOrdem = (conteudos?.length ?? 0) + 1;
  const tipo = TIPOS_DE_CONTEUDO.find((t) => t.value === dados.tipo)?.label ?? "Conteúdo";

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await criar.mutateAsync(montarConteudo(dados, proximaOrdem));
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    limpar();
    navigate(voltarPara);
  };

  return (
    <PaginaCriacao
      titulo="Novo conteúdo"
      subtitulo={clube?.nome}
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para os conteúdos do clube"
    >
      <SecaoCriacao titulo="1. O conteúdo" descricao="Material para os membros: vídeo, PDF, áudio, texto ou link.">
        <div className="grid gap-1.5">
          <Label htmlFor="conteudo-titulo">Título</Label>
          <Input
            id="conteudo-titulo"
            value={dados.titulo}
            maxLength={160}
            onChange={(e) => mudar({ titulo: e.target.value })}
            placeholder="Ex.: Aula 1: contexto histórico do livro"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="conteudo-tipo">Tipo</Label>
          <Select value={dados.tipo} onValueChange={(v) => mudar({ tipo: v })}>
            <SelectTrigger id="conteudo-tipo" className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DE_CONTEUDO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="conteudo-url">Link do conteúdo</Label>
          <Input
            id="conteudo-url"
            type="url"
            inputMode="url"
            value={dados.url_conteudo}
            onChange={(e) => mudar({ url_conteudo: e.target.value })}
            placeholder="https://"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="conteudo-descricao">Descrição (opcional)</Label>
          <Textarea
            id="conteudo-descricao"
            rows={3}
            value={dados.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
            placeholder="O que a pessoa vai encontrar aqui?"
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="2. Liberação" descricao="Use para soltar o material aos poucos para quem entra no clube.">
        <div className="grid gap-1.5">
          <Label htmlFor="conteudo-dias">Dias de espera depois da entrada no clube</Label>
          <Input
            id="conteudo-dias"
            type="number"
            inputMode="numeric"
            min={0}
            value={dados.liberado_apos_dias}
            onChange={(e) => mudar({ liberado_apos_dias: e.target.value })}
            className="h-11 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">{explicarLiberacao(dados.liberado_apos_dias)}</p>
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como vai aparecer">
        <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1.5" aria-label="Prévia do conteúdo">
          <p className="text-xs font-medium text-primary">
            {tipo} · posição {proximaOrdem} da biblioteca
          </p>
          <p className="font-semibold leading-snug break-words">{dados.titulo.trim() || "Título do conteúdo"}</p>
          {dados.descricao.trim() && (
            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{dados.descricao.trim()}</p>
          )}
          {dados.url_conteudo.trim() && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 min-w-0">
              <Link2 className="w-4 h-4 shrink-0" /> <span className="truncate">{dados.url_conteudo.trim()}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 shrink-0" /> {explicarLiberacao(dados.liberado_apos_dias)}
          </p>
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={voltarPara}>
        <Button onClick={salvar} disabled={criar.isPending} className="rounded-xl">
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar conteúdo"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default CriarConteudo;
