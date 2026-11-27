import { Fragment } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, ArchiveRestore, Pencil, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bloco, ErroDoPainel } from "@/components/painel/PartesDoPainel";
import { useArquivarPlano, useAtribuirPlano, useOrganizadoresComPlano, usePlanos, useSalvarPlano } from "@/hooks/admin/usePlanos";
import {
  GRUPOS_DE_RECURSO,
  RECURSOS,
  descontoAnual,
  excessosDoOrganizador,
  formatarPreco,
  limitesDoPlano,
  organizadoresPorPlano,
  planoDoOrganizador,
  planosAtivos,
  type Plano,
} from "@/lib/planos";
import { cn } from "@/lib/utils";

// Admin > Planos: cadastro dos planos do organizador, recursos de cada um e
// o plano de cada organizador. Ainda não limita nada no app (ver docs/planos.md).

const PADRAO = "padrao";

const Selo = ({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "certo" | "destaque" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      tom === "certo" && "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
      tom === "destaque" && "bg-primary/10 text-primary",
      tom === "neutro" && "bg-muted text-muted-foreground",
    )}
  >
    {children}
  </span>
);

const CartaoDoPlano = ({ plano, organizadores }: { plano: Plano; organizadores: number }) => {
  const arquivar = useArquivarPlano();
  const desconto = descontoAnual(plano.preco_mensal_centavos, plano.preco_anual_centavos);

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col gap-3 min-w-0",
        plano.destaque ? "border-primary" : "border-border",
      )}
      aria-label={`Plano ${plano.nome}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Selo tom={plano.publicado ? "certo" : "neutro"}>{plano.publicado ? "Publicado" : "Rascunho"}</Selo>
        {plano.padrao && <Selo>Padrão</Selo>}
        {plano.destaque && (
          <Selo tom="destaque">
            <Star className="w-3 h-3" aria-hidden="true" /> Destaque
          </Selo>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold break-words">{plano.nome}</h3>
        {plano.descricao && <p className="text-sm text-muted-foreground break-words">{plano.descricao}</p>}
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tabular-nums">
          {formatarPreco(plano.preco_mensal_centavos)}
          {plano.preco_mensal_centavos > 0 && <span className="text-sm font-normal text-muted-foreground"> por mês</span>}
        </p>
        {plano.preco_anual_centavos !== null && plano.preco_mensal_centavos > 0 && (
          <p className="text-xs text-muted-foreground">
            ou {formatarPreco(plano.preco_anual_centavos)} por ano{desconto ? ` (${desconto}% de desconto)` : ""}
          </p>
        )}
        {plano.dias_de_teste > 0 && <p className="text-xs text-muted-foreground">{plano.dias_de_teste} dias de teste</p>}
      </div>
      <ul className="text-sm flex flex-col gap-1">
        {limitesDoPlano(plano).map((limite) => (
          <li key={limite}>{limite}</li>
        ))}
        <li className="text-muted-foreground">
          {plano.recursos.length} de {RECURSOS.length} recursos
        </li>
      </ul>
      <p className="text-xs text-muted-foreground mt-auto">
        {organizadores === 1 ? "1 organizador neste plano" : `${organizadores} organizadores neste plano`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to={`/admin/planos/${plano.id}`}>
            <Pencil className="w-4 h-4" /> Editar
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground"
          disabled={plano.padrao || arquivar.isPending}
          title={plano.padrao ? "O plano padrão não pode ser arquivado. Escolha outro padrão antes." : undefined}
          onClick={() => arquivar.mutate({ id: plano.id, arquivar: true })}
        >
          <Archive className="w-4 h-4" /> Arquivar
        </Button>
      </div>
    </article>
  );
};

const MatrizDeRecursos = ({ planos }: { planos: Plano[] }) => {
  const salvar = useSalvarPlano();

  const alternar = (plano: Plano, chave: string, ligado: boolean) => {
    const marcados = new Set(plano.recursos);
    if (ligado) marcados.add(chave);
    else marcados.delete(chave);
    salvar.mutate({ id: plano.id, dados: { recursos: RECURSOS.filter((r) => marcados.has(r.chave)).map((r) => r.chave) } });
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="text-left font-medium text-muted-foreground py-2 pr-3">
              Recurso
            </th>
            {planos.map((p) => (
              <th key={p.id} scope="col" className="font-medium py-2 px-2 text-center w-28 min-w-[84px]">
                {p.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRUPOS_DE_RECURSO.map((grupo) => (
            <Fragment key={grupo}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={planos.length + 1}
                  className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1"
                >
                  {grupo}
                </th>
              </tr>
              {RECURSOS.filter((r) => r.grupo === grupo).map((recurso) => (
                <tr key={recurso.chave} className="border-b border-border/60">
                  <th scope="row" className="text-left font-normal py-2 pr-3 sticky left-0 bg-card min-w-[150px]">
                    <span className="font-medium">{recurso.rotulo}</span>
                    {recurso.emBreve && <span className="ml-2 text-xs text-muted-foreground">(em breve)</span>}
                    <span className="block text-xs text-muted-foreground">{recurso.descricao}</span>
                  </th>
                  {planos.map((p) => (
                    <td key={p.id} className="text-center px-2">
                      <Checkbox
                        checked={p.recursos.includes(recurso.chave)}
                        disabled={salvar.isPending}
                        onCheckedChange={(valor) => alternar(p, recurso.chave, valor === true)}
                        aria-label={`${recurso.rotulo} no plano ${p.nome}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Organizadores = ({ planos, todos }: { planos: Plano[]; todos: Plano[] }) => {
  const { data: organizadores = [], isLoading, error } = useOrganizadoresComPlano();
  const atribuir = useAtribuirPlano();
  const padrao = planos.find((p) => p.padrao);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (error) return <ErroDoPainel erro={error} />;
  if (organizadores.length === 0) return <p className="text-sm text-muted-foreground">Ainda não há organizadores.</p>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {organizadores.map((o) => {
        const plano = planoDoOrganizador(o, todos);
        const excessos = excessosDoOrganizador(o, plano);
        return (
          <li key={o.user_id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="font-medium break-words">{o.nome}</p>
              <p className="text-xs text-muted-foreground">
                {o.clubes === 1 ? "1 clube" : `${o.clubes} clubes`} · maior com{" "}
                {o.maior_clube === 1 ? "1 membro" : `${o.maior_clube} membros`}
              </p>
              {excessos.length > 0 && (
                <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                  Acima do plano: {excessos.join("; ")}
                </p>
              )}
            </div>
            <Select
              value={o.plano_id ?? PADRAO}
              disabled={atribuir.isPending}
              onValueChange={(valor) => atribuir.mutate({ userId: o.user_id, planoId: valor === PADRAO ? null : valor })}
            >
              <SelectTrigger className="h-9 w-full sm:w-56 shrink-0" aria-label={`Plano de ${o.nome}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PADRAO}>{padrao ? `Padrão (${padrao.nome})` : "Sem plano"}</SelectItem>
                {todos
                  .filter((p) => !p.arquivado_em || p.id === o.plano_id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                      {p.arquivado_em ? " (arquivado)" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </li>
        );
      })}
    </ul>
  );
};

export const PlanosTab = () => {
  const { data: todos = [], isLoading, error } = usePlanos();
  const { data: organizadores = [] } = useOrganizadoresComPlano();
  const arquivar = useArquivarPlano();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) return <ErroDoPainel erro={error} />;

  const planos = planosAtivos(todos);
  const arquivados = todos.filter((p) => p.arquivado_em);
  const contagem = organizadoresPorPlano(organizadores, todos);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Monte os planos do organizador: preço, limites e recursos. Os limites de clubes, membros e co-curadores já
          valem no app. Quem não tem plano atribuído usa o plano padrão. Ainda não há cobrança, e os recursos e o limite
          de IA ainda não bloqueiam nada.
        </p>
        <Button asChild className="gap-1.5">
          <Link to="/admin/planos/novo">
            <Plus className="w-4 h-4" /> Novo plano
          </Link>
        </Button>
      </header>

      {planos.length === 0 ? (
        <Bloco titulo="Nenhum plano ainda" descricao="Crie o primeiro plano para começar a montar a oferta.">
          <div>
            <Button asChild variant="outline">
              <Link to="/admin/planos/novo">Criar plano</Link>
            </Button>
          </div>
        </Bloco>
      ) : (
        <>
          {!planos.some((p) => p.padrao) && (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 px-4 py-3 text-sm">
              Nenhum plano está marcado como padrão. Quem não tem plano atribuído fica sem plano. Edite um plano e marque
              "Plano padrão".
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {planos.map((p) => (
              <CartaoDoPlano key={p.id} plano={p} organizadores={contagem[p.id] ?? 0} />
            ))}
          </div>

          <Bloco titulo="Recursos por plano" descricao="Marque o que cada plano inclui. A mudança é salva na hora.">
            <MatrizDeRecursos planos={planos} />
          </Bloco>
        </>
      )}

      <Bloco
        titulo="Organizadores"
        descricao="Plano de cada pessoa que organiza um clube. O aviso aparece quando o uso passa do limite do plano."
      >
        <Organizadores planos={planos} todos={todos} />
      </Bloco>

      {arquivados.length > 0 && (
        <Bloco titulo="Planos arquivados" descricao="Não são mais oferecidos. Quem já estava em um deles continua nele.">
          <ul className="flex flex-col divide-y divide-border">
            {arquivados.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {p.nome} <span className="text-muted-foreground text-sm">· {formatarPreco(p.preco_mensal_centavos)}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  disabled={arquivar.isPending}
                  onClick={() => arquivar.mutate({ id: p.id, arquivar: false })}
                >
                  <ArchiveRestore className="w-4 h-4" /> Reativar
                </Button>
              </li>
            ))}
          </ul>
        </Bloco>
      )}
    </div>
  );
};
