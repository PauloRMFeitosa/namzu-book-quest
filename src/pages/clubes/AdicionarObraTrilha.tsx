import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ObraAutocomplete } from "@/components/cadastro-manual/ObraAutocomplete";
import { useClube, useClubeMembership } from "@/hooks/clubes/useClube";
import { usePermissoesClube } from "@/hooks/clubes/useClubeGestao";
import { useAdicionarTrilha, useObraParaTrilha, useTrilhasGestao } from "@/hooks/clubes/useClubeTrilhasGestao";
import { usePaginasDasObras } from "@/hooks/clubes/useCronograma";
import { diaComSemana, textoDoAlvo } from "@/lib/cronograma";
import { metasSemanaisDaObra, resumoDasMetas, validarNovaObra } from "@/lib/trilha";

// Inclusão de obra na trilha do clube. É uma página, não uma janela: criação
// no NAMZU acontece em página própria (ver CLAUDE.md).

const draftKey = (clubeId: string) => `draft-trilha-${clubeId}`;

interface Rascunho {
  titulo: string;
  obraId: string | null;
  inicio: string;
  fim: string;
  criarMetasSemanais: boolean;
}

const VAZIO: Rascunho = { titulo: "", obraId: null, inicio: "", fim: "", criarMetasSemanais: false };

const lerRascunho = (clubeId: string): Rascunho => {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(clubeId)) ?? "{}");
    return {
      titulo: typeof d.titulo === "string" ? d.titulo : "",
      obraId: typeof d.obraId === "string" ? d.obraId : null,
      inicio: typeof d.inicio === "string" ? d.inicio : "",
      fim: typeof d.fim === "string" ? d.fim : "",
      criarMetasSemanais: d.criarMetasSemanais === true,
    };
  } catch {
    return VAZIO;
  }
};

const AdicionarObraTrilha = () => {
  const { id: clubeId = "" } = useParams();
  const navigate = useNavigate();
  const voltarPara = `/clubes/${clubeId}?tab=gestao`;

  const { data: clube, isLoading: carregandoClube } = useClube(clubeId);
  const { isLoading: carregandoParticipacao } = useClubeMembership(clubeId);
  const { podeGerir } = usePermissoesClube(clubeId, clube?.curador_id);
  const { data: trilha } = useTrilhasGestao(clubeId);
  const adicionar = useAdicionarTrilha(clubeId);

  const [dados, setDados] = useState<Rascunho>(() => lerRascunho(clubeId));
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const mudar = (parte: Partial<Rascunho>) => setDados((atual) => ({ ...atual, ...parte }));

  // O rascunho fica guardado enquanto a página está aberta; só some ao salvar.
  useEffect(() => {
    if (!clubeId) return;
    localStorage.setItem(draftKey(clubeId), JSON.stringify(dados));
  }, [clubeId, dados]);

  const { data: obra, isLoading: carregandoObra } = useObraParaTrilha(dados.obraId);
  const { data: paginas } = usePaginasDasObras(dados.obraId ? [dados.obraId] : []);
  const totalPaginas = dados.obraId ? paginas?.[dados.obraId] : undefined;

  const obrasNaTrilha = (trilha ?? []).map((t) => t.obra_id);
  const erro = validarNovaObra(dados, obrasNaTrilha);
  const jaNaTrilha = !!dados.obraId && obrasNaTrilha.includes(dados.obraId);
  const metas = metasSemanaisDaObra(dados);
  const temPeriodo = !!dados.inicio && !!dados.fim;

  if (carregandoClube || carregandoParticipacao) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }
  if (!clube || !podeGerir) return <Navigate to={`/clubes/${clubeId}`} replace />;

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro || !dados.obraId) return;
    try {
      await adicionar.mutateAsync({
        obra_id: dados.obraId,
        data_inicio_sugerida: dados.inicio || null,
        data_fim_sugerida: dados.fim || null,
        metas,
      });
    } catch {
      return; // o hook já mostrou o erro; o rascunho continua guardado
    }
    localStorage.removeItem(draftKey(clubeId));
    navigate(voltarPara);
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl w-full mx-auto pb-6">
      <header className="flex items-start gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-xl shrink-0" aria-label="Voltar para a gestão do clube">
          <Link to={voltarPara}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight">Adicionar obra à trilha</h1>
          <p className="text-sm text-muted-foreground truncate">{clube.nome}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">1. Livro</h2>
          <p className="text-sm text-muted-foreground">Busque pelo título no acervo do NAMZU.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="trilha-obra" className="sr-only">
            Título do livro
          </Label>
          <ObraAutocomplete
            value={dados.titulo}
            obraId={dados.obraId}
            onChange={(titulo, obraId) => mudar({ titulo, obraId })}
          />
        </div>

        {dados.obraId && carregandoObra && <Skeleton className="h-28 rounded-xl" />}
        {dados.obraId && obra && (
          <div className="flex gap-3 rounded-xl bg-muted/50 p-3">
            {obra.capa_padrao_url ? (
              <img src={obra.capa_padrao_url} alt="" className="w-16 h-24 rounded-md object-cover shrink-0 self-start" />
            ) : (
              <div className="w-16 h-24 rounded-md bg-muted flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex flex-col gap-1">
              <p className="font-semibold leading-snug">{obra.titulo_original}</p>
              {obra.autores.length > 0 && <p className="text-sm text-muted-foreground">{obra.autores.join(", ")}</p>}
              <p className="text-xs text-muted-foreground">
                {[obra.ano_primeira_publicacao, totalPaginas ? `${totalPaginas} páginas` : null].filter(Boolean).join(" · ")}
              </p>
              {obra.sinopse_padrao && <p className="text-sm text-muted-foreground line-clamp-3">{obra.sinopse_padrao}</p>}
            </div>
          </div>
        )}
        {jaNaTrilha && (
          <p role="alert" className="text-sm text-destructive">
            Este livro já está na trilha do clube.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Não achou o livro?{" "}
          <Link to="/cadastro-manual" className="underline underline-offset-2">
            Cadastre no acervo
          </Link>{" "}
          e volte aqui. O que você já preencheu fica guardado.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">2. Período de leitura</h2>
          <p className="text-sm text-muted-foreground">Opcional. Você pode definir ou mudar depois, pela Gestão.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid gap-1.5 min-w-0">
            <Label htmlFor="trilha-inicio">Início</Label>
            <Input
              id="trilha-inicio"
              type="date"
              value={dados.inicio}
              onChange={(e) => mudar({ inicio: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-1.5 min-w-0">
            <Label htmlFor="trilha-fim">Fim</Label>
            <Input
              id="trilha-fim"
              type="date"
              value={dados.fim}
              min={dados.inicio || undefined}
              onChange={(e) => mudar({ fim: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">3. Metas semanais</h2>
            <p className="text-sm text-muted-foreground">
              {temPeriodo
                ? "Divide o período em uma meta por semana. Dá para ajustar depois no cronograma."
                : "Informe o início e o fim para dividir a leitura em semanas."}
            </p>
          </div>
          <Switch
            checked={dados.criarMetasSemanais}
            onCheckedChange={(v) => mudar({ criarMetasSemanais: v })}
            disabled={!temPeriodo && !dados.criarMetasSemanais}
            aria-label="Criar metas semanais"
          />
        </div>
        {metas.length > 0 && (
          <>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-primary" /> {resumoDasMetas(metas.length)}
            </p>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {metas.map((m) => (
                <li key={m.data_limite} className="px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                  <span className="font-medium">{m.titulo}</span>
                  <span className="text-muted-foreground">
                    até {diaComSemana(m.data_limite)}
                    {m.percentual_alvo ? ` · ${textoDoAlvo(m.percentual_alvo, totalPaginas)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {tentouSalvar && erro && !jaNaTrilha && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="ghost" asChild className="rounded-xl">
          <Link to={voltarPara}>Cancelar</Link>
        </Button>
        <Button onClick={salvar} disabled={adicionar.isPending || jaNaTrilha} className="rounded-xl">
          {adicionar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar à trilha"}
        </Button>
      </div>
    </div>
  );
};

export default AdicionarObraTrilha;
