import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarRange, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TrilhaGestao } from "@/components/clubes/gestao/TrilhaGestao";
import { useAcervoObras } from "@/hooks/useAcervoObras";
import { cn } from "@/lib/utils";
import { useClube, useClubeMembership } from "@/hooks/clubes/useClube";
import { usePermissoesClube } from "@/hooks/clubes/useClubeGestao";
import { useAdicionarTrilha, useObraParaTrilha, useTrilhasGestao } from "@/hooks/clubes/useClubeTrilhasGestao";
import { usePaginasDasObras } from "@/hooks/clubes/useCronograma";
import { diaComSemana, textoDoAlvo } from "@/lib/cronograma";
import { filtrarAcervo, metasSemanaisDaObra, resumoDasMetas, validarNovaObra } from "@/lib/trilha";

// Inclusão de obra na trilha do clube. É uma página, não uma janela: criação
// no NAMZU acontece em página própria (ver CLAUDE.md).

const draftKey = (clubeId: string) => `draft-trilha-${clubeId}`;

interface Rascunho {
  /** O que foi digitado para filtrar o acervo. */
  busca: string;
  obraId: string | null;
  inicio: string;
  fim: string;
  criarMetasSemanais: boolean;
}

const LIVROS_POR_VEZ = 30;

const VAZIO: Rascunho = { busca: "", obraId: null, inicio: "", fim: "", criarMetasSemanais: false };

const lerRascunho = (clubeId: string): Rascunho => {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(clubeId)) ?? "{}");
    return {
      busca: typeof d.busca === "string" ? d.busca : "",
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
  const voltarPara = `/clubes/${clubeId}/painel?secao=leitura`;

  const { data: clube, isLoading: carregandoClube } = useClube(clubeId);
  const { isLoading: carregandoParticipacao } = useClubeMembership(clubeId);
  const { podeGerir } = usePermissoesClube(clubeId, clube?.curador_id);
  const { data: trilha } = useTrilhasGestao(clubeId);
  const adicionar = useAdicionarTrilha(clubeId);

  const [dados, setDados] = useState<Rascunho>(() => lerRascunho(clubeId));
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [visiveis, setVisiveis] = useState(LIVROS_POR_VEZ);
  const { data: acervo, isLoading: carregandoAcervo } = useAcervoObras();
  const mudar = (parte: Partial<Rascunho>) => setDados((atual) => ({ ...atual, ...parte }));

  // O rascunho fica guardado enquanto há algo preenchido; some ao salvar.
  useEffect(() => {
    if (!clubeId) return;
    const emBranco = !dados.busca && !dados.obraId && !dados.inicio && !dados.fim && !dados.criarMetasSemanais;
    if (emBranco) localStorage.removeItem(draftKey(clubeId));
    else localStorage.setItem(draftKey(clubeId), JSON.stringify(dados));
  }, [clubeId, dados]);

  const { data: obra, isLoading: carregandoObra } = useObraParaTrilha(dados.obraId);
  const { data: paginas } = usePaginasDasObras(dados.obraId ? [dados.obraId] : []);
  const totalPaginas = dados.obraId ? paginas?.[dados.obraId] : undefined;

  const obrasNaTrilha = (trilha ?? []).map((t) => t.obra_id);
  const erro = validarNovaObra(dados, obrasNaTrilha);
  const jaNaTrilha = !!dados.obraId && obrasNaTrilha.includes(dados.obraId);
  const metas = metasSemanaisDaObra(dados);
  const temPeriodo = !!dados.inicio && !!dados.fim;
  const livros = filtrarAcervo(acervo ?? [], dados.busca);

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
    // Fica na página, pronta para o próximo livro; a trilha logo abaixo já mostra o que entrou.
    setDados(VAZIO);
    setTentouSalvar(false);
    setVisiveis(LIVROS_POR_VEZ);
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl w-full mx-auto pb-6">
      <header className="flex items-start gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-xl shrink-0" aria-label="Voltar para o painel do organizador">
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
          <p className="text-sm text-muted-foreground">Toque na capa para escolher. A busca filtra por título ou autoria.</p>
        </div>
        <div className="relative">
          <Label htmlFor="trilha-busca" className="sr-only">
            Buscar no acervo
          </Label>
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            id="trilha-busca"
            type="search"
            value={dados.busca}
            onChange={(e) => {
              mudar({ busca: e.target.value });
              setVisiveis(LIVROS_POR_VEZ);
            }}
            placeholder="Buscar por título ou autoria"
            className="h-11 rounded-xl pl-9"
          />
        </div>

        {dados.obraId && carregandoObra && <Skeleton className="h-28 rounded-xl" />}
        {dados.obraId && obra && (
          <div className="flex gap-3 rounded-xl bg-muted/50 p-3" aria-label="Livro escolhido">
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
        {carregandoAcervo ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : livros.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum livro encontrado no acervo.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{livros.length === 1 ? "1 livro" : `${livros.length} livros`}</p>
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {livros.slice(0, visiveis).map((l) => {
                const escolhido = l.obra_id === dados.obraId;
                const naTrilha = obrasNaTrilha.includes(l.obra_id);
                return (
                  <li key={l.obra_id}>
                    <button
                      type="button"
                      disabled={naTrilha}
                      aria-pressed={escolhido}
                      onClick={() => mudar({ obraId: escolhido ? null : l.obra_id })}
                      className="w-full text-left group disabled:cursor-not-allowed"
                    >
                      <div
                        className={cn(
                          "relative rounded-xl overflow-hidden ring-offset-2 ring-offset-card transition-shadow",
                          escolhido && "ring-2 ring-primary",
                          naTrilha && "opacity-50",
                        )}
                      >
                        {l.capa_url ? (
                          <img src={l.capa_url} alt="" loading="lazy" className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-secondary flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        {escolhido && (
                          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {naTrilha && (
                          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 text-background text-[10px] font-medium text-center py-0.5">
                            Já na trilha
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium line-clamp-2 break-words mt-1.5">{l.titulo}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {[l.autor, l.ano].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            {visiveis < livros.length && (
              <Button variant="outline" className="rounded-xl" onClick={() => setVisiveis((v) => v + LIVROS_POR_VEZ)}>
                Carregar mais
              </Button>
            )}
          </>
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
          <p className="text-sm text-muted-foreground">Opcional. Você pode definir ou mudar depois, no painel.</p>
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

      <Button onClick={salvar} disabled={adicionar.isPending || jaNaTrilha} className="rounded-xl h-11">
        {adicionar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar à trilha"}
      </Button>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <TrilhaGestao clubeId={clubeId} titulo="Trilha do clube agora" semAdicionar />
        <p className="text-xs text-muted-foreground">
          Cada livro que você adiciona aparece aqui. Dá para reordenar, remover e montar o cronograma sem sair da página.
        </p>
      </div>

      <Button variant="outline" asChild className="rounded-xl">
        <Link to={voltarPara}>Concluir e voltar para o painel</Link>
      </Button>
    </div>
  );
};

export default AdicionarObraTrilha;
