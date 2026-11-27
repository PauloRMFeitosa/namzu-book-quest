import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CarregandoCriacao } from "@/components/criacao/CarregandoCriacao";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { usePlanos, useSalvarPlano } from "@/hooks/admin/usePlanos";
import { useRascunho } from "@/hooks/useRascunho";
import {
  GRUPOS_DE_RECURSO,
  MAXIMO_DESCRICAO_PLANO,
  MAXIMO_NOME_PLANO,
  PLANO_VAZIO,
  RECURSOS,
  centavosDoTexto,
  chaveDoNome,
  descontoAnual,
  formatarPreco,
  limitesDoPlano,
  montarPlano,
  planoParaFormulario,
  validarPlano,
  type FormularioDoPlano,
} from "@/lib/planos";

const VOLTAR = "/admin?secao=planos";
const CHAVE_DO_RASCUNHO = "draft-plano";

const CampoDeNumero = ({
  id,
  rotulo,
  ajuda,
  valor,
  onMudar,
  placeholder = "Sem limite",
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
}) => (
  <div className="grid gap-1.5 min-w-0">
    <Label htmlFor={id}>{rotulo}</Label>
    <Input
      id={id}
      inputMode="numeric"
      placeholder={placeholder}
      value={valor}
      onChange={(e) => onMudar(e.target.value)}
      className="h-11 rounded-xl"
    />
    {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
  </div>
);

const Chave = ({
  id,
  rotulo,
  ajuda,
  ligado,
  onMudar,
}: {
  id: string;
  rotulo: string;
  ajuda: string;
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <Label htmlFor={id}>{rotulo}</Label>
      <p className="text-xs text-muted-foreground">{ajuda}</p>
    </div>
    <Switch id={id} checked={ligado} onCheckedChange={onMudar} />
  </div>
);

// Formulário do plano. Na criação o estado vem do rascunho; na edição, do plano salvo.
const FormularioPlano = ({
  planoId,
  dados,
  mudar,
  aoSalvar,
  chavesEmUso,
}: {
  planoId?: string;
  dados: FormularioDoPlano;
  mudar: (parte: Partial<FormularioDoPlano>) => void;
  aoSalvar: () => void;
  chavesEmUso: string[];
}) => {
  const navigate = useNavigate();
  const salvar = useSalvarPlano();
  const [tentouSalvar, setTentouSalvar] = useState(false);
  // Na criação, o identificador acompanha o nome até a pessoa mexer nele.
  const [chaveEditada, setChaveEditada] = useState(!!planoId || (!!dados.chave && dados.chave !== chaveDoNome(dados.nome)));

  const erro = validarPlano(dados, chavesEmUso);
  const mensal = centavosDoTexto(dados.precoMensal);
  const anual = centavosDoTexto(dados.precoAnual);
  const previa = erro ? null : montarPlano(dados);
  const desconto = previa ? descontoAnual(previa.preco_mensal_centavos, previa.preco_anual_centavos) : null;

  const alternarRecurso = (chave: string, ligado: boolean) =>
    mudar({ recursos: ligado ? [...dados.recursos, chave] : dados.recursos.filter((r) => r !== chave) });

  const enviar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await salvar.mutateAsync({ id: planoId, dados: montarPlano(dados) });
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    toast.success(planoId ? "Plano atualizado." : "Plano criado.");
    aoSalvar();
    navigate(VOLTAR);
  };

  return (
    <PaginaCriacao
      titulo={planoId ? "Editar plano" : "Novo plano"}
      subtitulo={planoId ? dados.nome : "Plano do organizador"}
      voltarPara={VOLTAR}
      rotuloVoltar="Voltar para os planos"
    >
      <SecaoCriacao titulo="1. Identificação" descricao="Como o plano aparece para o organizador.">
        <div className="grid gap-1.5">
          <Label htmlFor="plano-nome">Nome</Label>
          <Input
            id="plano-nome"
            maxLength={MAXIMO_NOME_PLANO}
            placeholder="Ex.: Organizador"
            value={dados.nome}
            onChange={(e) =>
              mudar(chaveEditada ? { nome: e.target.value } : { nome: e.target.value, chave: chaveDoNome(e.target.value) })
            }
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="plano-chave">Identificador</Label>
          <Input
            id="plano-chave"
            maxLength={40}
            placeholder="organizador"
            value={dados.chave}
            onChange={(e) => {
              setChaveEditada(true);
              mudar({ chave: e.target.value.toLowerCase() });
            }}
            className="h-11 rounded-xl font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Nome interno, usado pelo sistema. Evite trocar depois que o plano estiver em uso.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="plano-descricao">Descrição</Label>
          <Textarea
            id="plano-descricao"
            rows={2}
            maxLength={MAXIMO_DESCRICAO_PLANO}
            placeholder="Para quem é este plano?"
            value={dados.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
          />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="2. Preço" descricao="Deixe o preço mensal vazio para um plano grátis.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CampoDeNumero id="plano-mensal" rotulo="Mensal (R$)" placeholder="Grátis" valor={dados.precoMensal} onMudar={(v) => mudar({ precoMensal: v })} />
          <CampoDeNumero id="plano-anual" rotulo="Anual (R$)" placeholder="Não oferece" valor={dados.precoAnual} onMudar={(v) => mudar({ precoAnual: v })} />
          <CampoDeNumero id="plano-teste" rotulo="Dias de teste" placeholder="Sem teste" valor={dados.diasDeTeste} onMudar={(v) => mudar({ diasDeTeste: v })} />
        </div>
        {mensal && anual && !Number.isNaN(mensal) && !Number.isNaN(anual) ? (
          <p className="text-xs text-muted-foreground">
            {descontoAnual(mensal, anual)
              ? `O anual sai ${descontoAnual(mensal, anual)}% mais barato que 12 mensalidades.`
              : "O anual não dá desconto em relação a 12 mensalidades."}
          </p>
        ) : null}
      </SecaoCriacao>

      <SecaoCriacao titulo="3. Limites" descricao="Campo vazio quer dizer sem limite.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoDeNumero id="plano-membros" rotulo="Membros por clube" valor={dados.limiteMembros} onMudar={(v) => mudar({ limiteMembros: v })} />
          <CampoDeNumero id="plano-clubes" rotulo="Clubes por organizador" valor={dados.limiteClubes} onMudar={(v) => mudar({ limiteClubes: v })} />
          <CampoDeNumero id="plano-cocuradores" rotulo="Co-curadores por clube" ajuda="Zero para não permitir." valor={dados.limiteCoCuradores} onMudar={(v) => mudar({ limiteCoCuradores: v })} />
          <CampoDeNumero id="plano-ia" rotulo="Usos de IA por mês" ajuda="Zero para não permitir." valor={dados.limiteIaMes} onMudar={(v) => mudar({ limiteIaMes: v })} />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="4. Recursos" descricao="O que o plano inclui. Os marcados como em breve ainda não existem no app.">
        {GRUPOS_DE_RECURSO.map((grupo) => (
          <fieldset key={grupo} className="flex flex-col gap-2">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-1">{grupo}</legend>
            {RECURSOS.filter((r) => r.grupo === grupo).map((recurso) => (
              <label key={recurso.chave} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={dados.recursos.includes(recurso.chave)}
                  onCheckedChange={(valor) => alternarRecurso(recurso.chave, valor === true)}
                />
                <span className="min-w-0">
                  <span className="text-sm font-medium">{recurso.rotulo}</span>
                  {recurso.emBreve && <span className="ml-2 text-xs text-muted-foreground">(em breve)</span>}
                  <span className="block text-xs text-muted-foreground">{recurso.descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => mudar({ recursos: RECURSOS.map((r) => r.chave) })}>
            Marcar todos
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => mudar({ recursos: [] })}>
            Limpar
          </Button>
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="5. Oferta" descricao="Como o plano entra na oferta.">
        <Chave id="plano-publicado" rotulo="Publicado" ajuda="Aparece na página de preços. Desligado, fica como rascunho ou plano interno." ligado={dados.publicado} onMudar={(v) => mudar({ publicado: v })} />
        <Chave id="plano-destaque" rotulo="Destaque" ajuda="Marca o plano como o recomendado." ligado={dados.destaque} onMudar={(v) => mudar({ destaque: v })} />
        <Chave id="plano-padrao" rotulo="Plano padrão" ajuda="Vale para quem não tem plano atribuído. Marcar aqui tira a marca do padrão atual." ligado={dados.padrao} onMudar={(v) => mudar({ padrao: v })} />
        <CampoDeNumero id="plano-ordem" rotulo="Ordem" placeholder="0" ajuda="Posição na lista. O menor número vem primeiro." valor={dados.ordem} onMudar={(v) => mudar({ ordem: v })} />
      </SecaoCriacao>

      <SecaoCriacao titulo="Como o plano vai ficar">
        <div className="rounded-xl bg-muted/50 p-4 flex flex-col gap-2" aria-label="Prévia do plano">
          <p className="font-display text-lg font-semibold break-words">{dados.nome.trim() || "Nome do plano"}</p>
          {previa ? (
            <>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatarPreco(previa.preco_mensal_centavos)}
                {previa.preco_mensal_centavos > 0 && <span className="text-sm font-normal text-muted-foreground"> por mês</span>}
              </p>
              {previa.preco_anual_centavos !== null && previa.preco_mensal_centavos > 0 && (
                <p className="text-xs text-muted-foreground">
                  ou {formatarPreco(previa.preco_anual_centavos)} por ano{desconto ? ` (${desconto}% de desconto)` : ""}
                </p>
              )}
              <ul className="text-sm flex flex-col gap-1">
                {limitesDoPlano(previa).map((limite) => (
                  <li key={limite}>{limite}</li>
                ))}
                <li className="text-muted-foreground">
                  {previa.recursos.length} de {RECURSOS.length} recursos
                </li>
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Preencha os campos para ver o preço e os limites.</p>
          )}
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara={VOLTAR}>
        <Button onClick={enviar} disabled={salvar.isPending} className="rounded-xl">
          {salvar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : planoId ? "Salvar alterações" : "Criar plano"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

const NovoPlano = ({ chavesEmUso }: { chavesEmUso: string[] }) => {
  const { dados, mudar, limpar } = useRascunho(CHAVE_DO_RASCUNHO, PLANO_VAZIO);
  return <FormularioPlano dados={dados} mudar={mudar} aoSalvar={limpar} chavesEmUso={chavesEmUso} />;
};

const PlanoExistente = ({ inicial, planoId, chavesEmUso }: { inicial: FormularioDoPlano; planoId: string; chavesEmUso: string[] }) => {
  const [dados, setDados] = useState(inicial);
  return (
    <FormularioPlano
      planoId={planoId}
      dados={dados}
      mudar={(parte) => setDados((atual) => ({ ...atual, ...parte }))}
      aoSalvar={() => undefined}
      chavesEmUso={chavesEmUso}
    />
  );
};

// Admin: criar (/admin/planos/novo) ou editar (/admin/planos/:id) um plano do organizador.
const EditarPlano = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: planos, isLoading } = usePlanos();
  const plano = id ? planos?.find((p) => p.id === id) : undefined;
  const naoAchou = !!id && !isLoading && !plano;

  useEffect(() => {
    document.title = `${id ? "Editar plano" : "Novo plano"} · Admin NAMZU`;
    return () => {
      document.title = "Namzu";
    };
  }, [id]);

  useEffect(() => {
    if (naoAchou) navigate(VOLTAR, { replace: true });
  }, [naoAchou, navigate]);

  const chavesEmUso = (planos ?? []).filter((p) => p.id !== id).map((p) => p.chave);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 lg:py-10">
      {isLoading || naoAchou ? (
        <CarregandoCriacao />
      ) : plano ? (
        <PlanoExistente key={plano.id} inicial={planoParaFormulario(plano)} planoId={plano.id} chavesEmUso={chavesEmUso} />
      ) : (
        <NovoPlano chavesEmUso={chavesEmUso} />
      )}
    </div>
  );
};

export default EditarPlano;
