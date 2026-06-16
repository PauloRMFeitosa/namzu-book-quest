import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/PageHero";
import {
  BookOpen,
  Plus,
  Library,
  Heart,
  Search,
  LayoutGrid,
  List,
  Star,
  MoreVertical,
  Users,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invalidateLeituras } from "@/lib/queryInvalidation";

type Filtro = "todos" | "lendo" | "quero_ler" | "lido" | "relendo" | "favoritos";
type Ordenacao = "recentes" | "titulo_asc" | "titulo_desc" | "autor_asc";
type ViewMode = "grade" | "lista";

const Livros = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");
  const [viewMode, setViewMode] = useState<ViewMode>("grade");
  const [removerAlvo, setRemoverAlvo] = useState<{ id: string; titulo: string } | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [favoritando, setFavoritando] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  // Reseta paginação virtual ao mudar qualquer filtro
  useEffect(() => {
    setVisibleCount(30);
  }, [filtro, busca, ordenacao, showAll]);

  // Callback ref: re-observa o sentinel toda vez que ele monta/desmonta
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => c + 24);
      },
      { rootMargin: "200px" }
    );
    observerRef.current.observe(node);
  }, []);

  // Progresso de leitura por usuario_livro_id (só livros com status "lendo")
  const { data: progressoMap } = useQuery({
    queryKey: ["livros-progresso", user?.id],
    enabled: !!user,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data: rows } = await supabase.rpc("get_progresso_lendo");
      const map: Record<string, number> = {};
      for (const r of rows ?? []) {
        map[(r as any).usuario_livro_id] = Number((r as any).percentual_lido ?? 0);
      }
      return map;
    },
  });

  const { data = [] } = useQuery({
    queryKey: ["meus-livros", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: livros } = await supabase
        .from("usuario_livros")
        .select(
          "id, status, favorito, nota, obra_id, created_at, updated_at, obras(id, titulo_original, capa_padrao_url, titulo_ordenacao, obra_autores(autores(nome_completo)), obra_generos(generos(nome, slug)))"
        )
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      const list = livros ?? [];
      const lendoIds = new Set<string>();
      const concluidoIds = new Set<string>();

      const { data: exps } = await supabase
        .from("usuario_leituras")
        .select("usuario_livro_id, status, usuario_livros!inner(user_id)")
        .eq("usuario_livros.user_id", user!.id);

      for (const e of exps ?? []) {
        if (e.status === "lendo") lendoIds.add((e as any).usuario_livro_id);
        if (e.status === "concluido") concluidoIds.add((e as any).usuario_livro_id);
      }

      return list.map((l: any) => ({
        ...l,
        statusEfetivo:
          l.status === "relendo"
            ? "relendo"
            : lendoIds.has(l.id)
            ? "lendo"
            : l.status === "lido" || l.status === "concluido" || concluidoIds.has(l.id)
            ? "lido"
            : l.status,
        autorNome: l.obras?.obra_autores?.[0]?.autores?.nome_completo ?? null,
      }));
    },
  });

  const confirmarRemocao = async () => {
    if (!removerAlvo) return;
    setRemovendo(true);
    const { error } = await supabase
      .from("usuario_livros")
      .delete()
      .eq("id", removerAlvo.id)
      .eq("user_id", user!.id);
    setRemovendo(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Livro removido da biblioteca");
    setRemoverAlvo(null);
    invalidateLeituras(qc);
  };

  const toggleFavorito = async (id: string, atual: boolean) => {
    setFavoritando(id);
    const { error } = await supabase
      .from("usuario_livros")
      .update({ favorito: !atual })
      .eq("id", id)
      .eq("user_id", user!.id);
    setFavoritando(null);
    if (error) {
      toast.error("Erro ao atualizar favorito");
      return;
    }
    qc.invalidateQueries({ queryKey: ["meus-livros", user?.id] });
  };

  const counts = {
    todos: data.length,
    lendo: data.filter((l: any) => l.statusEfetivo === "lendo").length,
    quero_ler: data.filter((l: any) => l.statusEfetivo === "quero_ler").length,
    lido: data.filter((l: any) => l.statusEfetivo === "lido").length,
    relendo: data.filter((l: any) => l.statusEfetivo === "relendo").length,
    favoritos: data.filter((l: any) => !!l.favorito).length,
  };

  const filtrados = useMemo(() => {
    let result = (data as any[]).filter((l) => {
      const matchFiltro =
        filtro === "todos"
          ? true
          : filtro === "favoritos"
          ? !!l.favorito
          : l.statusEfetivo === filtro;
      const matchBusca = busca
        ? l.obras?.titulo_original?.toLowerCase().includes(busca.toLowerCase()) ||
          l.autorNome?.toLowerCase().includes(busca.toLowerCase())
        : true;
      return matchFiltro && matchBusca;
    });

    switch (ordenacao) {
      case "titulo_asc":
        result = [...result].sort((a, b) =>
          (a.obras?.titulo_ordenacao ?? "").localeCompare(b.obras?.titulo_ordenacao ?? "")
        );
        break;
      case "titulo_desc":
        result = [...result].sort((a, b) =>
          (b.obras?.titulo_ordenacao ?? "").localeCompare(a.obras?.titulo_ordenacao ?? "")
        );
        break;
      case "autor_asc":
        result = [...result].sort((a, b) =>
          (a.autorNome ?? "").localeCompare(b.autorNome ?? "")
        );
        break;
    }
    return result;
  }, [data, filtro, busca, ordenacao]);

  // Aggregate stats
  const stats = useMemo(() => {
    const autoresSet = new Set<string>();
    const categoriasSet = new Set<string>();
    for (const l of data as any[]) {
      for (const oa of l.obras?.obra_autores ?? []) {
        if (oa.autores?.nome_completo) autoresSet.add(oa.autores.nome_completo);
      }
      for (const og of l.obras?.obra_generos ?? []) {
        if (og.generos?.slug) categoriasSet.add(og.generos.slug);
      }
    }
    return {
      livros: data.length,
      autores: autoresSet.size,
      categorias: categoriasSet.size,
    };
  }, [data]);

  const recentes = useMemo(() => (data as any[]).slice(0, 12), [data]);

  const chips: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "lendo", label: "Lendo" },
    { key: "relendo", label: "Relendo" },
    { key: "quero_ler", label: "Quero ler" },
    { key: "lido", label: "Lidos" },
    { key: "favoritos", label: "Favoritos" },
  ];

  const isFiltered = filtro !== "todos" || busca !== "" || showAll;

  // Reusable book card (grade mode)
  const renderBookCard = (l: any) => {
    const pct = progressoMap?.[l.id];
    const isLendo = l.statusEfetivo === "lendo" || l.statusEfetivo === "relendo";

    return (
    <div key={l.id} className="relative group">
      <div className="relative">
        <button
          onClick={() => navigate(`/obras/${l.obra_id}`)}
          className="w-full hover-lift block"
        >
          {l.obras?.capa_padrao_url ? (
            <img
              src={l.obras.capa_padrao_url}
              alt=""
              className="w-full aspect-[2/3] rounded-xl object-cover shadow-soft"
            />
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          )}

          {isLendo && pct != null && pct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5">
              <div className="w-full h-1.5 rounded-full bg-black/40 backdrop-blur-sm overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <p className="text-[9px] text-white/90 font-semibold text-center mt-0.5 drop-shadow">
                {Math.round(pct)}%
              </p>
            </div>
          )}

          {isLendo && (pct == null || pct === 0) && (
            <div className="absolute bottom-1.5 left-1.5">
              <span className="text-[9px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                Lendo
              </span>
            </div>
          )}
        </button>

        <button
          onClick={() => toggleFavorito(l.id, !!l.favorito)}
          disabled={favoritando === l.id}
          className={cn(
            "absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity",
            l.favorito
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
          aria-label={l.favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart
            className={cn(
              "w-3.5 h-3.5",
              l.favorito ? "fill-rose-500 text-rose-500" : "text-white"
            )}
          />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              <MoreVertical className="w-3.5 h-3.5 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuItem onClick={() => navigate(`/obras/${l.obra_id}`)}>
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() =>
                setRemoverAlvo({
                  id: l.id,
                  titulo: l.obras?.titulo_original ?? "este livro",
                })
              }
            >
              Remover da biblioteca
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        onClick={() => navigate(`/obras/${l.obra_id}`)}
        className="w-full text-left mt-2"
      >
        <p className="text-sm font-medium line-clamp-2 break-words min-h-[2.5rem]">
          {l.obras?.titulo_original}
        </p>
        {l.autorNome && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{l.autorNome}</p>
        )}
      </button>
      {l.nota != null && (
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-muted-foreground">{Number(l.nota).toFixed(1)}</span>
        </div>
      )}
    </div>
    );
  };

  // Reusable book row (list mode)
  const renderBookRow = (l: any) => {
    const pct = progressoMap?.[l.id];
    const isLendo = l.statusEfetivo === "lendo" || l.statusEfetivo === "relendo";

    return (
    <div
      key={l.id}
      className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-muted/50 group"
    >
      <button
        onClick={() => navigate(`/obras/${l.obra_id}`)}
        className="flex-shrink-0"
      >
        {l.obras?.capa_padrao_url ? (
          <img
            src={l.obras.capa_padrao_url}
            alt=""
            className="w-10 aspect-[2/3] rounded-md object-cover"
          />
        ) : (
          <div className="w-10 aspect-[2/3] rounded-md bg-secondary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
        )}
      </button>

      <button
        onClick={() => navigate(`/obras/${l.obra_id}`)}
        className="flex-1 text-left min-w-0"
      >
        <p className="text-sm font-medium line-clamp-1">{l.obras?.titulo_original}</p>
        {l.autorNome && (
          <p className="text-xs text-muted-foreground">{l.autorNome}</p>
        )}
        {isLendo && pct != null && pct > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
          </div>
        )}
      </button>

      {l.nota != null && (
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-muted-foreground">{Number(l.nota).toFixed(1)}</span>
        </div>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => toggleFavorito(l.id, !!l.favorito)}
          disabled={favoritando === l.id}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center",
            l.favorito ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("w-4 h-4", l.favorito && "fill-rose-500")} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={() => navigate(`/obras/${l.obra_id}`)}>
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() =>
                setRemoverAlvo({
                  id: l.id,
                  titulo: l.obras?.titulo_original ?? "este livro",
                })
              }
            >
              Remover da biblioteca
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHero
        icon={Library}
        badge="Biblioteca"
        title={
          <>
            Meus <span className="text-gradient-warm">livros</span>
          </>
        }
        description="Sua coleção organizada por status."
      />

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setShowAll(false); }}
          placeholder="Buscar por título ou autor..."
          className="pl-10 rounded-2xl bg-muted border-0 focus-visible:ring-1"
        />
      </div>

      {/* ── Status tabs ── */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
        {chips.map((c) => {
          const ativo = filtro === c.key;
          return (
            <button
              key={c.key}
              onClick={() => { setFiltro(filtro === c.key && c.key !== "todos" ? "todos" : c.key); setShowAll(false); }}
              className={cn(
                "rounded-full px-4 h-9 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 flex-shrink-0",
                ativo
                  ? c.key === "favoritos"
                    ? "bg-rose-500 text-white"
                    : "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted/50"
              )}
            >
              {c.key === "favoritos" && (
                <Heart className={cn("w-3.5 h-3.5", ativo && "fill-white")} />
              )}
              {c.label} ({counts[c.key]})
            </button>
          );
        })}
      </div>

      {/* ── Sort + View toggle ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por:</span>
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as Ordenacao)}>
            <SelectTrigger className="h-8 w-auto min-w-0 border-0 bg-muted rounded-full px-3 text-sm font-medium gap-1 focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="titulo_asc">Título A-Z</SelectItem>
              <SelectItem value="titulo_desc">Título Z-A</SelectItem>
              <SelectItem value="autor_asc">Autor A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-0.5 bg-muted rounded-full p-1 flex-shrink-0">
          <button
            onClick={() => setViewMode("grade")}
            className={cn(
              "flex items-center justify-center w-8 h-7 rounded-full transition-colors",
              viewMode === "grade"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("lista")}
            className={cn(
              "flex items-center justify-center w-8 h-7 rounded-full transition-colors",
              viewMode === "lista"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── HOME VIEW (grade + sem filtro) ── */}
      {!isFiltered && viewMode === "grade" ? (
        <>
          {/* Biblioteca stats */}
          <div className="bg-card rounded-2xl p-3 border border-border">
            <div className="mb-3">
              <span className="text-sm font-semibold">Biblioteca</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: BookOpen, value: stats.livros, label: "Livros" },
                { icon: Users, value: stats.autores, label: "Autores" },
                { icon: Tag, value: stats.categorias, label: "Categorias" },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/50"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold leading-none">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Adicionados recentemente */}
          {recentes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Adicionados recentemente</h3>
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs text-primary font-medium"
                >
                  Ver todos
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {recentes.map((l: any) => renderBookCard(l))}
              </div>
            </div>
          )}

          {data.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Sua biblioteca está vazia. Adicione o primeiro livro!
              </p>
              <Button
                onClick={() => navigate("/busca")}
                className="rounded-2xl bg-primary hover:bg-primary-hover"
              >
                <Plus className="w-4 h-4" /> Buscar livros
              </Button>
            </div>
          )}
        </>
      ) : (
        /* ── FILTERED VIEW ── */
        filtrados.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhum livro nesta lista.</p>
            <Button
              onClick={() => navigate("/busca")}
              className="rounded-2xl bg-primary hover:bg-primary-hover"
            >
              <Plus className="w-4 h-4" /> Adicionar livro
            </Button>
          </div>
        ) : (
          <>
            {viewMode === "grade" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {filtrados.slice(0, visibleCount).map((l: any) => renderBookCard(l))}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/50">
                {filtrados.slice(0, visibleCount).map((l: any) => renderBookRow(l))}
              </div>
            )}

            {visibleCount < filtrados.length && (
              <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                Carregando mais livros…
              </div>
            )}

            {visibleCount >= filtrados.length && filtrados.length > 30 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                {filtrados.length} livros exibidos
              </p>
            )}
          </>
        )
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removerAlvo} onOpenChange={(o) => !o && setRemoverAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              "{removerAlvo?.titulo}" será removido da sua biblioteca, junto com leituras e
              progresso vinculados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarRemocao();
              }}
              disabled={removendo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendo ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Livros;
