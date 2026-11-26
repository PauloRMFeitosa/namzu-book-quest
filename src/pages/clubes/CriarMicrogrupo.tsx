import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, Lock, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { useAcessoGestao } from "@/hooks/clubes/useAcessoGestao";
import { useCriarMicrogrupo } from "@/hooks/clubes/useMicrogrupos";
import { useRascunho } from "@/hooks/useRascunho";
import { MICROGRUPO_VAZIO, TIPOS_DE_MICROGRUPO, montarMicrogrupo, validarNovoMicrogrupo } from "@/lib/criacao";

const draftKey = (clubeId: string) => `draft-microgrupo-${clubeId}`;

// Qualquer membro ativo do clube pode criar um microgrupo.
const CriarMicrogrupo = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}?tab=microgrupos`;
  const { clube, carregando, liberadoParaMembro } = useAcessoGestao(clubeId);
  const { dados, mudar, limpar } = useRascunho(draftKey(clubeId), MICROGRUPO_VAZIO);
  const criar = useCriarMicrogrupo(clubeId);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  if (carregando) return <CarregandoCriacao />;
  if (!liberadoParaMembro) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const erro = validarNovoMicrogrupo(dados);
  const tipo = TIPOS_DE_MICROGRUPO.find((t) => t.value === dados.tipo) ?? TIPOS_DE_MICROGRUPO[0];

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await criar.mutateAsync(montarMicrogrupo(dados));
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    limpar();
    navigate(voltarPara);
  };

  return (
    <PaginaCriacao
      titulo="Novo microgrupo"
      subtitulo={clube?.nome}
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para os microgrupos do clube"
    >
      <SecaoCriacao titulo="1. O microgrupo" descricao="Um grupo pequeno, dentro do clube, para conversas mais próximas.">
        <div className="grid gap-1.5">
          <Label htmlFor="microgrupo-nome">Nome</Label>
          <Input
            id="microgrupo-nome"
            value={dados.nome}
            maxLength={60}
            onChange={(e) => mudar({ nome: e.target.value })}
            placeholder="Ex.: Filosofia matinal"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="microgrupo-descricao">Descrição (opcional)</Label>
          <Textarea
            id="microgrupo-descricao"
            rows={3}
            maxLength={280}
            value={dados.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
            placeholder="Qual é o propósito do grupo?"
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="2. Como funciona">
        <RadioGroup value={dados.tipo} onValueChange={(v) => mudar({ tipo: v })} className="grid gap-2">
          {TIPOS_DE_MICROGRUPO.map((t) => (
            <Label
              key={t.value}
              htmlFor={`microgrupo-tipo-${t.value}`}
              className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem id={`microgrupo-tipo-${t.value}`} value={t.value} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{t.label}</span>
                <span className="text-sm font-normal text-muted-foreground">{t.explicacao}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <div className="grid gap-1.5">
          <Label htmlFor="microgrupo-limite">Limite de membros</Label>
          <Input
            id="microgrupo-limite"
            type="number"
            inputMode="numeric"
            min={2}
            max={50}
            value={dados.limite}
            onChange={(e) => mudar({ limite: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
          <Label htmlFor="microgrupo-privado" className="flex flex-col gap-0.5 cursor-pointer">
            <span className="font-medium">Privado</span>
            <span className="text-sm font-normal text-muted-foreground">Só quem for convidado vê o grupo.</span>
          </Label>
          <Switch id="microgrupo-privado" checked={dados.privado} onCheckedChange={(v) => mudar({ privado: v })} />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como vai aparecer">
        <div className="rounded-xl bg-muted/50 p-3 flex items-start gap-3" aria-label="Prévia do microgrupo">
          <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <UsersRound className="w-4 h-4 text-primary" />
          </span>
          <div className="min-w-0 flex flex-col gap-0.5">
            <p className="font-semibold text-sm break-words flex items-center gap-1.5">
              {dados.nome.trim() || "Nome do microgrupo"}
              {dados.privado && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="Privado" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {tipo.label} · até {dados.limite || "?"} membros
            </p>
            {dados.descricao.trim() && (
              <p className="text-sm text-muted-foreground line-clamp-2 break-words">{dados.descricao.trim()}</p>
            )}
          </div>
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={voltarPara}>
        <Button onClick={salvar} disabled={criar.isPending} className="rounded-xl">
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar microgrupo"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default CriarMicrogrupo;
