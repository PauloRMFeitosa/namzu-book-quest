import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Link2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useCriarEvento } from "@/hooks/clubes/useEventos";
import { useRascunho } from "@/hooks/useRascunho";
import { ENCONTRO_VAZIO, TIPOS_DE_ENCONTRO, montarEncontro, validarNovoEncontro } from "@/lib/criacao";
import { quandoDoEncontro } from "@/lib/encontros";

const draftKey = (clubeId: string) => `draft-evento-${clubeId}`;

const CriarEvento = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}?tab=eventos`;
  const { clube, carregando, liberado } = useAcessoGestao(clubeId);
  const { dados, mudar, limpar } = useRascunho(draftKey(clubeId), ENCONTRO_VAZIO);
  const criar = useCriarEvento(clubeId);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  if (carregando) return <CarregandoCriacao />;
  if (!liberado) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const erro = validarNovoEncontro(dados);
  const tipo = TIPOS_DE_ENCONTRO.find((t) => t.value === dados.tipo)?.label ?? "Encontro";
  const quando = dados.inicio ? quandoDoEncontro(dados.inicio) : "";

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await criar.mutateAsync(montarEncontro(dados));
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    limpar();
    navigate(voltarPara);
  };

  return (
    <PaginaCriacao
      titulo="Novo encontro"
      subtitulo={clube?.nome}
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para os eventos do clube"
    >
      <SecaoCriacao titulo="1. O encontro">
        <div className="grid gap-1.5">
          <Label htmlFor="evento-titulo">Título</Label>
          <Input
            id="evento-titulo"
            value={dados.titulo}
            maxLength={120}
            onChange={(e) => mudar({ titulo: e.target.value })}
            placeholder="Ex.: Encontro de dezembro"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="evento-tipo">Tipo</Label>
          <Select value={dados.tipo} onValueChange={(v) => mudar({ tipo: v })}>
            <SelectTrigger id="evento-tipo" className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DE_ENCONTRO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="evento-descricao">Descrição (opcional)</Label>
          <Textarea
            id="evento-descricao"
            rows={3}
            value={dados.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
            placeholder="O que vai ser conversado? Até onde ler?"
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="2. Quando" descricao="Os membros recebem lembrete 24 h e 1 h antes.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-1.5 min-w-0">
            <Label htmlFor="evento-inicio">Início</Label>
            <Input
              id="evento-inicio"
              type="datetime-local"
              value={dados.inicio}
              onChange={(e) => mudar({ inicio: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-1.5 min-w-0">
            <Label htmlFor="evento-fim">Término (opcional)</Label>
            <Input
              id="evento-fim"
              type="datetime-local"
              value={dados.fim}
              min={dados.inicio || undefined}
              onChange={(e) => mudar({ fim: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="3. Onde e para quantos" descricao="Opcional.">
        <div className="grid gap-1.5">
          <Label htmlFor="evento-url">Link da chamada</Label>
          <Input
            id="evento-url"
            type="url"
            inputMode="url"
            value={dados.url}
            onChange={(e) => mudar({ url: e.target.value })}
            placeholder="https://"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="evento-limite">Limite de participantes</Label>
          <Input
            id="evento-limite"
            type="number"
            inputMode="numeric"
            min={1}
            value={dados.limite}
            onChange={(e) => mudar({ limite: e.target.value })}
            placeholder="Sem limite"
            className="h-11 rounded-xl"
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como vai aparecer">
        <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1.5" aria-label="Prévia do encontro">
          <p className="text-xs font-medium text-primary">{tipo}</p>
          <p className="font-semibold leading-snug break-words">{dados.titulo.trim() || "Título do encontro"}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0" /> {quando || "Dia e hora a definir"}
          </p>
          {dados.url.trim() && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 min-w-0">
              <Link2 className="w-4 h-4 shrink-0" /> <span className="truncate">{dados.url.trim()}</span>
            </p>
          )}
          {dados.limite.trim() && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 shrink-0" /> Até {dados.limite.trim()} participantes
            </p>
          )}
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={voltarPara}>
        <Button onClick={salvar} disabled={criar.isPending} className="rounded-xl">
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar encontro"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default CriarEvento;
