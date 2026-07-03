import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";
import {
  Search,
  Plus,
  BookOpen,
  Globe,
  Loader2,
  Check,
  BookmarkPlus,
  CheckCheck,
  X,
  Compass,
  ScanLine,
  LayoutGrid,
  List,
} from "lucide-react";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AddStatus = "quero_ler" | "lido";

type Ordenacao = "titulo_asc" | "titulo_desc" | "autor_asc" | "autor_desc";
type ViewMode = "grade" | "lista";

interface AcervoItem {
  obra_id: string;
  edicao_id: string | null;
  titulo: string;
  titulo_ordenacao: string;
  ano: number | null;
  capa_url: string | null;
  autor: string | null;
  autor_ordenacao: string;
}

interface LocalResult {
  origem: "local";
  obra_id: string;
  edicao_id?: string | null;
  titulo: string;
  autor?: string;
  ano?: number | null;
  capa_url?: string | null;
  isbn13?: string | null;
}

interface ExternalResult {
  origem: "externo";
  key: string;
  titulo: string;
  autores: string[];
  ano: number | null;
  capa_url: string | null;
  isbn13: string | null;
  fonte: string;
  editora?: string | null;
  num_paginas?: number | null;
  idioma?: string | null;
  descricao?: string | null;
  generos?: string[];
}

const cache = new Map<string, { local: LocalResult[]; externo: ExternalResult[] }>();
const PAGE_SIZE = 30;

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function externalKey(b: { isbn13: string | null; titulo: string; autores: string[] }) {
  return b.isbn13
    ? `i:${b.isbn13}`
    : `t:${normalize(b.titulo)}|${normalize(b.autores[0] ?? "")}`;
}

const Busca = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [fTitulo, setFTitulo] = useState("");
  const [fAutor, setFAutor] = useState("");
  const [fIsbn, setFIsbn] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ titulo: string; autor: string; isbn: string } | null>(null);

  const [local, setLocal] = useState<LocalResult[]>([]);
  const [externo, setExterno] = useState<ExternalResult[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingExterno, setLoadingExterno] = useState(false);
  const [erroExterno, setErroExterno] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const [addTarget, setAddTarget] = useState<
    | { key: string; titulo: string; autor?: string | null; capa?: string | null; onAdd: (s: AddStatus) => void }
    | null
  >(null);

  // Controles do acervo
  const [buscaAcervo, setBuscaAcervo] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("titulo_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grade");
  const [visiveis, setVisiveis] = useState(PAGE_SIZE);

  const mostrandoAcervo = !submitted;

  // Acervo (apenas quando não há termo de busca)
  const { data: acervo = [], isLoading: loadingAcervo } = useQuery({
    queryKey: ["acervo-obras"],
    enabled: mostrandoAcervo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select(
          `id, titulo_original, titulo_ordenacao, ano_primeira_publicacao, capa_padrao_url,
           obra_autores!left(ordem, autores(nome_completo, nome_ordenacao)),
           edicoes!left(id)`,
        )
        .limit(500);

      if (error) {
        console.error("acervo query", error);
        return [] as AcervoItem[];
      }

      const items: AcervoItem[] = [];
      const seen = new Set<string>();

      for (const o of data ?? []) {
        if (!o || seen.has(o.id)) continue;
        seen.add(o.id);
        const oas: any[] = (o as any).obra_autores ?? [];
        const principal = oas.slice().sort((a: any, b: any) => (a.ordem ?? 99) - (b.ordem ?? 99))[0];
        const autorNome = principal?.autores?.nome_completo ?? null;
        const autorOrd = principal?.autores?.nome_ordenacao ?? "zzz";
        const edicoes: any[] = (o as any).edicoes ?? [];
        items.push({
          obra_id: (o as any).id,
          edicao_id: edicoes[0]?.id ?? null,
          titulo: (o as any).titulo_original,
          titulo_ordenacao: (o as any).titulo_ordenacao ?? (o as any).titulo_original?.toLowerCase() ?? "",
          ano: (o as any).ano_primeira_publicacao,
          capa_url: (o as any).capa_padrao_url,
          autor: autorNome,
          autor_ordenacao: autorOrd,
        });
      }
      return items;
    },
  });

  // Ordenação client-side
  const acervoOrdenado = useMemo(() => {
    const arr = [...acervo];
    arr.sort((a, b) => {
      switch (ordenacao) {
        case "titulo_desc":
          return b.titulo_ordenacao.localeCompare(a.titulo_ordenacao, "pt-BR");
        case "autor_asc":
          return a.autor_ordenacao.localeCompare(b.autor_ordenacao, "pt-BR");
        case "autor_desc":
          return b.autor_ordenacao.localeCompare(a.autor_ordenacao, "pt-BR");
        case "titulo_asc":
        default:
          return a.titulo_ordenacao.localeCompare(b.titulo_ordenacao, "pt-BR");
      }
    });
    return arr;
  }, [acervo, ordenacao]);

  // Filtro textual client-side
  const acervoFiltrado = useMemo(() => {
    const termo = normalize(buscaAcervo.trim());
    if (!termo) return acervoOrdenado;
    return acervoOrdenado.filter(
      (r) =>
        normalize(r.titulo).includes(termo) ||
        (r.autor && normalize(r.autor).includes(termo)),
    );
  }, [acervoOrdenado, buscaAcervo]);

  useEffect(() => {
    setVisiveis(PAGE_SIZE);
  }, [ordenacao, buscaAcervo, mostrandoAcervo]);

  // Busca disparada por submit
  useEffect(() => {
    if (!submitted) {
      setLocal([]);
      setExterno([]);
      setLoadingLocal(false);
      setLoadingExterno(false);
      setErroExterno(false);
      return;
    }

    const { titulo, autor, isbn } = submitted;
    const cacheKey = `t:${titulo}|a:${autor}|i:${isbn}`.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) {
      setLocal(cached.local);
      setExterno(cached.externo);
      setLoadingLocal(false);
      setLoadingExterno(false);
      setErroExterno(false);
      return;
    }

    let cancelado = false;
    (async () => {
      setLoadingLocal(true);
      setExterno([]);
      setErroExterno(false);
      setLoadingExterno(false);

      const map = new Map<string, LocalResult>();
      const promises: PromiseLike<any>[] = [];

      if (titulo) {
        promises.push(
          supabase
            .from("obras")
            .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao")
            .ilike("titulo_ordenacao", `%${titulo.toLowerCase()}%`)
            .limit(20)
            .then(({ data }) => {
              (data ?? []).forEach((o: any) =>
                map.set(o.id, {
                  origem: "local",
                  obra_id: o.id,
                  titulo: o.titulo_original,
                  ano: o.ano_primeira_publicacao,
                  capa_url: o.capa_padrao_url,
                }),
              );
            }),
        );
      }
      if (autor) {
        promises.push(
          supabase
            .from("obra_autores")
            .select(
              "obra_id, autores!inner(nome_completo, nome_ordenacao), obras!inner(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)",
            )
            .ilike("autores.nome_ordenacao", `%${normalize(autor)}%`)
            .limit(20)
            .then(({ data }) => {
              (data ?? []).forEach((row: any) => {
                const o = row.obras;
                if (!o || map.has(o.id)) return;
                map.set(o.id, {
                  origem: "local",
                  obra_id: o.id,
                  titulo: o.titulo_original,
                  autor: row.autores?.nome_completo,
                  ano: o.ano_primeira_publicacao,
                  capa_url: o.capa_padrao_url,
                });
              });
            }),
        );
      }
      if (isbn) {
        promises.push(
          supabase
            .from("edicoes")
            .select(
              "id, isbn_13, obra_id, obras!inner(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)",
            )
            .ilike("isbn_13", `%${isbn}%`)
            .limit(10)
            .then(({ data }) => {
              (data ?? []).forEach((row: any) => {
                const o = row.obras;
                if (!o || map.has(o.id)) return;
                map.set(o.id, {
                  origem: "local",
                  obra_id: o.id,
                  edicao_id: row.id,
                  titulo: o.titulo_original,
                  ano: o.ano_primeira_publicacao,
                  capa_url: o.capa_padrao_url,
                  isbn13: row.isbn_13,
                });
              });
            }),
        );
      }

      await Promise.all(promises);
      if (cancelado) return;

      const locais = Array.from(map.values());
      setLocal(locais);
      setLoadingLocal(false);

      if (locais.length === 0) {
        await runExterno(titulo, autor, isbn, cacheKey, locais, () => cancelado);
      } else {
        cache.set(cacheKey, { local: locais, externo: [] });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [submitted]);

  const runExterno = async (
    titulo: string,
    autor: string,
    isbn: string,
    cacheKey: string,
    locais: LocalResult[],
    isCancelado: () => boolean,
  ) => {
    setLoadingExterno(true);
    setErroExterno(false);
    try {
      const { data, error } = await supabase.functions.invoke("search-books", {
        body: { titulo, autor, isbn },
      });
      if (error) throw error;
      const results: ExternalResult[] = (data?.results ?? []).map((b: any) => ({
        origem: "externo" as const,
        key: externalKey({ isbn13: b.isbn13 ?? null, titulo: b.titulo, autores: b.autores ?? [] }),
        titulo: b.titulo,
        autores: b.autores ?? [],
        ano: b.ano ?? null,
        capa_url: b.capa_url ?? null,
        isbn13: b.isbn13 ?? null,
        fonte: b.fonte ?? "externo",
        editora: b.editora ?? null,
        num_paginas: b.num_paginas ?? null,
        idioma: b.idioma ?? null,
        descricao: b.descricao ?? null,
        generos: Array.isArray(b.generos) ? b.generos : [],
      }));
      if (isCancelado()) return;
      setExterno(results);
      cache.set(cacheKey, { local: locais, externo: results });
    } catch (e: any) {
      console.error("search-books failed", e);
      if (!isCancelado()) {
        setErroExterno(true);
        toast.error("Erro ao buscar em fontes externas");
      }
    } finally {
      if (!isCancelado()) setLoadingExterno(false);
    }
  };

  const handleBuscarExterno = () => {
    if (!submitted) return;
    const { titulo, autor, isbn } = submitted;
    const cacheKey = `t:${titulo}|a:${autor}|i:${isbn}`.toLowerCase();
    runExterno(titulo, autor, isbn, cacheKey, local, () => false);
  };

  const handleBuscar = () => {
    const t = fTitulo.trim();
    const a = fAutor.trim();
    const i = fIsbn.replace(/[-\s]/g, "");
    if (!t && !a && !i) {
      toast.info("Preencha ao menos um campo");
      return;
    }
    if (i && !/^\d{10}$|^\d{13}$/.test(i)) {
      toast.error("ISBN deve ter 10 ou 13 dígitos");
      return;
    }
    setSubmitted({ titulo: t, autor: a, isbn: i });
  };

  const handleLimpar = () => {
    setFTitulo("");
    setFAutor("");
    setFIsbn("");
    setSubmitted(null);
  };

  const invalidarLivros = () => {
    const run = async () => {
      const { invalidateLeituras } = await import("@/lib/queryInvalidation");
      invalidateLeituras(qc);
    };
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) ric(run, { timeout: 1500 });
    else setTimeout(run, 0);
  };

  const adicionarLocal = async (obraId: string, key: string, status: AddStatus, edicaoId?: string | null) => {
    if (!user) return;
    if (inFlightRef.current.has(key) || adicionados.has(key)) return;
    inFlightRef.current.add(key);
    setAdicionando(key);
    setAdicionados((s) => new Set(s).add(key));
    const today = new Date().toISOString().slice(0, 10);

    let resolvedEdicaoId = edicaoId ?? null;
    if (!resolvedEdicaoId) {
      const { data: eds } = await supabase
        .from("edicoes")
        .select("id")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: true })
        .limit(1);
      resolvedEdicaoId = eds?.[0]?.id ?? null;
    }

    const payload: Record<string, any> = {
      user_id: user.id,
      obra_id: obraId,
      ...(resolvedEdicaoId ? { edicao_id: resolvedEdicaoId } : {}),
      status,
      ...(status === "lido" ? { data_fim: today, data_inicio: today } : {}),
    };
    const { error } = await supabase.from("usuario_livros").insert(payload);
    inFlightRef.current.delete(key);
    setAdicionando(null);
    if (error) {
      if (error.code === "23505") {
        toast.info("Este livro já está na sua biblioteca");
        return;
      }
      setAdicionados((s) => { const n = new Set(s); n.delete(key); return n; });
      const msg = error.message?.includes("ranking_clube") || error.message?.includes("refresh")
        ? "Erro ao atualizar ranking. Tente novamente."
        : `Não foi possível adicionar: ${error.message}`;
      return toast.error(msg);
    }
    toast.success(status === "lido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler");
    invalidarLivros();
  };

  const adicionarExterno = async (b: ExternalResult, status: AddStatus) => {
    if (!user) return;
    if (inFlightRef.current.has(b.key) || adicionados.has(b.key)) return;
    inFlightRef.current.add(b.key);
    setAdicionando(b.key);
    setAdicionados((s) => new Set(s).add(b.key));
    const loadingId = toast.loading(status === "lido" ? "Registrando como lido…" : "Adicionando em Quero ler…");
    try {
      const { data, error } = await supabase.functions.invoke("rapid-action", {
        body: {
          mode: "registrar_resultado",
          titulo: b.titulo,
          autores: b.autores ?? [],
          ano: b.ano,
          isbn13: b.isbn13 ?? null,
          capa_url: b.capa_url ?? null,
          editora: b.editora ?? null,
          num_paginas: b.num_paginas ?? null,
          idioma: b.idioma ?? null,
          descricao: b.descricao ?? null,
          sourceId: b.isbn13 ?? b.key,
          generos: b.generos ?? [],
        },
      });
      if (error) throw error;
      const obraId = data?.obra?.id ?? data?.obra_id;
      if (!obraId) throw new Error("Resposta inválida da função");
      const edicaoId: string | null = data?.edicao_id ?? null;

      const today = new Date().toISOString().slice(0, 10);
      // edicao_id ausente é preenchido pelo trigger fn_auto_edicao_id_from_obra
      const { error: insErr } = await supabase.from("usuario_livros").insert({
        user_id: user.id,
        obra_id: obraId,
        ...(edicaoId ? { edicao_id: edicaoId } : {}),
        status,
        ...(status === "lido" ? { data_fim: today, data_inicio: today } : {}),
      } as TablesInsert<"usuario_livros">);
      if (insErr && insErr.code !== "23505") {
        const msg = insErr.message?.includes("ranking_clube") || insErr.message?.includes("refresh")
          ? "Erro ao atualizar ranking. Tente novamente."
          : insErr.message;
        throw new Error(msg);
      }

      setExterno((arr) => arr.filter((x) => x.key !== b.key));
      setLocal((arr) => [
        { origem: "local", obra_id: obraId, edicao_id: data?.edicao_id ?? null, titulo: b.titulo, autor: b.autores?.[0], ano: b.ano, capa_url: b.capa_url, isbn13: b.isbn13 ?? undefined },
        ...arr,
      ]);
      toast.success(status === "lido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler", { id: loadingId });
      invalidarLivros();
    } catch (e: any) {
      console.error("adicionarExterno", e);
      setAdicionados((s) => { const n = new Set(s); n.delete(b.key); return n; });
      toast.error(e?.message ?? "Erro ao adicionar", { id: loadingId });
    } finally {
      inFlightRef.current.delete(b.key);
      setAdicionando(null);
    }
  };

  // Card horizontal (modo lista / resultados de busca)
  const renderCard = (
    key: string,
    capa: string | null | undefined,
    titulo: string,
    autor: string | undefined | null,
    ano: number | null | undefined,
    onAdd: (status: AddStatus) => void,
    busy: boolean,
    done: boolean,
    badge?: string,
    obraId?: string,
  ) => {
    const Capa = capa ? (
      <img src={capa} alt="" className="w-14 h-20 rounded-md object-cover" />
    ) : (
      <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-primary" />
      </div>
    );
    const Info = (
      <div className="flex-1 min-w-0">
        <p className="font-semibold line-clamp-2">{titulo}</p>
        {autor && <p className="text-xs text-muted-foreground line-clamp-1">{autor}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          {ano && <p className="text-[10px] text-muted-foreground">{ano}</p>}
          {badge && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">· {badge}</span>}
        </div>
      </div>
    );
    return (
      <div key={key} className="card-soft p-3 flex gap-3 items-center">
        {obraId ? (
          <button onClick={() => navigate(`/obras/${obraId}`)} className="flex gap-3 items-center flex-1 min-w-0 text-left hover-lift">
            {Capa}{Info}
          </button>
        ) : (
          <>{Capa}{Info}</>
        )}
        <Button
          size="sm"
          disabled={busy || done}
          onClick={() => setAddTarget({ key, titulo, autor, capa, onAdd })}
          aria-label={done ? "Adicionado" : busy ? "Adicionando…" : "Adicionar à estante"}
          className="rounded-xl bg-primary hover:bg-primary-hover touch-manipulation"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    );
  };

  // Card grade (modo grade do acervo)
  const renderGradeCard = (r: AcervoItem) => {
    const busy = adicionando === r.obra_id;
    const done = adicionados.has(r.obra_id);
    return (
      <div key={r.obra_id} className="relative group">
        <div className="relative">
          <button onClick={() => navigate(`/obras/${r.obra_id}`)} className="w-full hover-lift block">
            {r.capa_url ? (
              <img src={r.capa_url} alt="" className="w-full aspect-[2/3] rounded-xl object-cover shadow-soft" />
            ) : (
              <div className="w-full aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
          </button>
          <button
            disabled={busy || done}
            onClick={() => setAddTarget({
              key: r.obra_id,
              titulo: r.titulo,
              autor: r.autor,
              capa: r.capa_url,
              onAdd: (s) => adicionarLocal(r.obra_id, r.obra_id, s, r.edicao_id),
            })}
            className={cn(
              "absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-opacity",
              done
                ? "bg-green-500 opacity-100"
                : "bg-primary opacity-0 group-hover:opacity-100 focus:opacity-100"
            )}
          >
            {busy
              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              : done
              ? <Check className="w-3.5 h-3.5 text-white" />
              : <Plus className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
        <button onClick={() => navigate(`/obras/${r.obra_id}`)} className="w-full text-left mt-1.5">
          <p className="text-xs font-medium line-clamp-2 break-words min-h-[2rem]">{r.titulo}</p>
          {r.autor && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{r.autor}</p>}
        </button>
      </div>
    );
  };

  const semResultadosBusca =
    !!submitted && !loadingLocal && !loadingExterno && !erroExterno && local.length === 0 && externo.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        icon={Compass}
        badge="Descobrir"
        title={<>Encontre seu próximo <span className="text-gradient-warm">livro</span></>}
        description="Busque no acervo do NAMZU ou em fontes externas."
      />
      <div className="flex items-center justify-end gap-3">
        <Button
          size="icon"
          onClick={() => navigate("/cadastro-manual")}
          className="rounded-full bg-primary hover:bg-primary-hover shrink-0"
          title="Cadastrar manualmente"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Formulário de busca externa */}
      <div className="flex flex-col gap-2 card-soft p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={fTitulo}
            onChange={(e) => setFTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            placeholder="Título"
            className="h-11 rounded-xl"
          />
          <Input
            value={fAutor}
            onChange={(e) => setFAutor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            placeholder="Autor"
            className="h-11 rounded-xl"
          />
          <div className="flex gap-2">
            <Input
              value={fIsbn}
              onChange={(e) => setFIsbn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              placeholder="ISBN (10 ou 13 dígitos)"
              inputMode="numeric"
              className="h-11 rounded-xl flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={() => setScannerOpen(true)}
              title="Ler código de barras"
            >
              <ScanLine className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleBuscar}
            disabled={loadingLocal || loadingExterno}
            className="flex-1 rounded-xl bg-primary hover:bg-primary-hover"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
          {(submitted || fTitulo || fAutor || fIsbn) && (
            <Button variant="outline" onClick={handleLimpar} className="rounded-xl">
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Controles do acervo — visíveis apenas quando não há busca submetida */}
      {mostrandoAcervo && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={buscaAcervo}
              onChange={(e) => setBuscaAcervo(e.target.value)}
              placeholder="Filtrar por título ou autor..."
              className="pl-10 rounded-2xl bg-muted border-0 focus-visible:ring-1"
            />
            {buscaAcervo && (
              <button
                onClick={() => setBuscaAcervo("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar:</span>
              <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as Ordenacao)}>
                <SelectTrigger className="h-8 w-auto min-w-0 border-0 bg-muted rounded-full px-3 text-sm font-medium gap-1 focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="titulo_asc">Título A-Z</SelectItem>
                  <SelectItem value="titulo_desc">Título Z-A</SelectItem>
                  <SelectItem value="autor_asc">Autor A-Z</SelectItem>
                  <SelectItem value="autor_desc">Autor Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-0.5 bg-muted rounded-full p-1 flex-shrink-0">
              <button
                onClick={() => setViewMode("grade")}
                className={cn(
                  "flex items-center justify-center w-8 h-7 rounded-full transition-colors",
                  viewMode === "grade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("lista")}
                className={cn(
                  "flex items-center justify-center w-8 h-7 rounded-full transition-colors",
                  viewMode === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acervo */}
      {mostrandoAcervo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Acervo {acervoFiltrado.length > 0 && `(${acervoFiltrado.length})`}
          </h2>
          {loadingAcervo ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando acervo…
            </p>
          ) : acervoFiltrado.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum livro encontrado.
            </p>
          ) : viewMode === "grade" ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {acervoFiltrado.slice(0, visiveis).map(renderGradeCard)}
              </div>
              {visiveis < acervoFiltrado.length && (
                <Button variant="outline" className="rounded-xl mt-2" onClick={() => setVisiveis((v) => v + PAGE_SIZE)}>
                  Carregar mais
                </Button>
              )}
            </>
          ) : (
            <>
              {acervoFiltrado.slice(0, visiveis).map((r) =>
                renderCard(
                  r.obra_id, r.capa_url, r.titulo, r.autor, r.ano,
                  (status) => adicionarLocal(r.obra_id, r.obra_id, status, r.edicao_id),
                  adicionando === r.obra_id, adicionados.has(r.obra_id),
                  undefined, r.obra_id,
                ),
              )}
              {visiveis < acervoFiltrado.length && (
                <Button variant="outline" className="rounded-xl mt-2" onClick={() => setVisiveis((v) => v + PAGE_SIZE)}>
                  Carregar mais
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {/* Resultados de busca textual */}
      {!!submitted && loadingLocal && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Buscando no acervo…
        </p>
      )}

      {local.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">No acervo</h2>
          {local.map((r) =>
            renderCard(
              r.obra_id, r.capa_url, r.titulo, r.autor, r.ano,
              (status) => adicionarLocal(r.obra_id, r.obra_id, status, r.edicao_id),
              adicionando === r.obra_id, adicionados.has(r.obra_id),
              undefined, r.obra_id,
            ),
          )}
        </section>
      )}

      {local.length > 0 && externo.length === 0 && !loadingExterno && !erroExterno && (
        <Button variant="outline" onClick={handleBuscarExterno} className="rounded-xl self-center">
          <Globe className="w-4 h-4 mr-2" /> Buscar também em fontes externas
        </Button>
      )}

      {local.length > 0 && loadingExterno && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 animate-pulse" /> Buscando em fontes externas…
        </p>
      )}

      {!!submitted && !loadingLocal && local.length === 0 && loadingExterno && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 animate-pulse" /> Buscando em fontes externas…
        </p>
      )}

      {externo.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> Encontrados na internet
          </h2>
          {externo.map((b) =>
            renderCard(
              b.key, b.capa_url, b.titulo, b.autores[0], b.ano,
              (status) => adicionarExterno(b, status),
              adicionando === b.key, adicionados.has(b.key), b.fonte,
            ),
          )}
        </section>
      )}

      {erroExterno && (
        <p className="text-sm text-destructive text-center py-4">
          Não foi possível consultar as fontes externas agora.
        </p>
      )}

      {semResultadosBusca && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-sm text-muted-foreground text-center">Nenhum livro encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/cadastro-manual")} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Cadastrar manualmente
          </Button>
        </div>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={(isbn) => {
          setFIsbn(isbn);
          setSubmitted({ titulo: fTitulo.trim(), autor: fAutor.trim(), isbn });
        }}
      />

      <Dialog open={!!addTarget} onOpenChange={(open) => { if (!open) setAddTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Adicionar à estante</DialogTitle>
            <DialogDescription>Escolha o status desta obra na sua biblioteca.</DialogDescription>
          </DialogHeader>
          {addTarget && (
            <div className="flex gap-3 items-center">
              {addTarget.capa ? (
                <img src={addTarget.capa} alt="" className="w-14 h-20 rounded-md object-cover" />
              ) : (
                <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold line-clamp-2">{addTarget.titulo}</p>
                {addTarget.autor && <p className="text-xs text-muted-foreground line-clamp-1">{addTarget.autor}</p>}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary-hover justify-start touch-manipulation"
              disabled={!!adicionando}
              onClick={() => { const t = addTarget; if (!t) return; setAddTarget(null); t.onAdd("quero_ler"); }}
            >
              <BookmarkPlus className="w-5 h-5 mr-2" /> Quero ler
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl justify-start touch-manipulation"
              disabled={!!adicionando}
              onClick={() => { const t = addTarget; if (!t) return; setAddTarget(null); t.onAdd("lido"); }}
            >
              <CheckCheck className="w-5 h-5 mr-2" /> Já li
            </Button>
            <Button variant="ghost" className="rounded-xl" onClick={() => setAddTarget(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Busca;
