import { useEffect, useMemo, useState } from "react";
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
  ArrowUpDown,
  X,
  Compass,
  ScanLine,
} from "lucide-react";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AddStatus = "quero_ler" | "lido";

type Ordenacao = "titulo_asc" | "titulo_desc" | "autor_asc" | "autor_desc";

interface AcervoItem {
  obra_id: string;
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
    .replace(/[\u0300-\u036f]/g, "")
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

  // Campos de busca separados
  const [fTitulo, setFTitulo] = useState("");
  const [fAutor, setFAutor] = useState("");
  const [fIsbn, setFIsbn] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  // Termo "submetido" — só muda ao clicar em Buscar
  const [submitted, setSubmitted] = useState<{ titulo: string; autor: string; isbn: string } | null>(null);

  const [local, setLocal] = useState<LocalResult[]>([]);
  const [externo, setExterno] = useState<ExternalResult[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingExterno, setLoadingExterno] = useState(false);
  const [erroExterno, setErroExterno] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set());

  // Controles do acervo
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("titulo_asc");
  const [filtroAutor, setFiltroAutor] = useState<string>("todos");
  const [filtroEditora, setFiltroEditora] = useState<string>("todos");
  const [visiveis, setVisiveis] = useState(PAGE_SIZE);

  const mostrandoAcervo = !submitted;

  // Lista de autores para o filtro
  const { data: autoresOpts = [] } = useQuery({
    queryKey: ["acervo-autores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("autores")
        .select("id, nome_completo, nome_ordenacao")
        .order("nome_ordenacao", { ascending: true })
        .limit(1000);
      return (data ?? []) as { id: string; nome_completo: string; nome_ordenacao: string }[];
    },
  });

  // Lista de editoras para o filtro
  const { data: editorasOpts = [] } = useQuery({
    queryKey: ["acervo-editoras"],
    queryFn: async () => {
      const { data } = await supabase.from("edicoes").select("editora").limit(1000);
      const set = new Set<string>();
      (data ?? []).forEach((e: any) => e?.editora && set.add(e.editora));
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });

  // Acervo (apenas quando não há termo de busca)
  const { data: acervo = [], isLoading: loadingAcervo } = useQuery({
    queryKey: ["acervo-obras", filtroAutor, filtroEditora],
    enabled: mostrandoAcervo,
    queryFn: async () => {
      let query = supabase
        .from("obras")
        .select(
          `id, titulo_original, titulo_ordenacao, ano_primeira_publicacao, capa_padrao_url,
           obra_autores!left(ordem, autores(nome_completo, nome_ordenacao))
           ${filtroEditora !== "todos" ? ", edicoes!inner(editora)" : ""}`,
        )
        .limit(500);

      if (filtroAutor !== "todos") {
        query = supabase
          .from("obra_autores")
          .select(
            `autor_id, ordem,
             autores!inner(nome_completo, nome_ordenacao),
             obras!inner(id, titulo_original, titulo_ordenacao, ano_primeira_publicacao, capa_padrao_url
               ${filtroEditora !== "todos" ? ", edicoes!inner(editora)" : ""}
             )`,
          )
          .eq("autor_id", filtroAutor)
          .limit(500) as any;
      }

      if (filtroEditora !== "todos") {
        query = (query as any).eq(
          filtroAutor !== "todos" ? "obras.edicoes.editora" : "edicoes.editora",
          filtroEditora,
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error("acervo query", error);
        return [] as AcervoItem[];
      }

      const items: AcervoItem[] = [];
      const seen = new Set<string>();

      const pushObra = (o: any, autorRow?: any) => {
        if (!o || seen.has(o.id)) return;
        seen.add(o.id);
        const oas = o.obra_autores ?? [];
        const principal = autorRow ??
          oas.slice().sort((a: any, b: any) => (a.ordem ?? 99) - (b.ordem ?? 99))[0];
        const autorNome = principal?.autores?.nome_completo ?? null;
        const autorOrd = principal?.autores?.nome_ordenacao ?? "zzz";
        items.push({
          obra_id: o.id,
          titulo: o.titulo_original,
          titulo_ordenacao: o.titulo_ordenacao ?? o.titulo_original?.toLowerCase() ?? "",
          ano: o.ano_primeira_publicacao,
          capa_url: o.capa_padrao_url,
          autor: autorNome,
          autor_ordenacao: autorOrd,
        });
      };

      if (filtroAutor !== "todos") {
        (data ?? []).forEach((row: any) => pushObra(row.obras, row));
      } else {
        (data ?? []).forEach((o: any) => pushObra(o));
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

  useEffect(() => {
    setVisiveis(PAGE_SIZE);
  }, [ordenacao, filtroAutor, filtroEditora, mostrandoAcervo]);

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
              "isbn_13, obra_id, obras!inner(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)",
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
        key: externalKey({
          isbn13: b.isbn13 ?? null,
          titulo: b.titulo,
          autores: b.autores ?? [],
        }),
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
      console.log("[Busca] resultados externos:", results.map((r) => ({ titulo: r.titulo, generos: r.generos })));
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


  const adicionarLocal = async (obraId: string, key: string, status: AddStatus) => {
    if (!user) return;
    setAdicionando(key);
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      user_id: user.id,
      obra_id: obraId,
      status,
      ...(status === "lido" ? { data_fim: today, data_inicio: today } : {}),
    };
    const { error } = await supabase.from("usuario_livros").insert(payload);
    setAdicionando(null);
    if (error) {
      console.error("adicionarLocal error", { code: error.code, message: error.message, details: (error as any).details, hint: (error as any).hint });
      if (error.code === "23505") {
        toast.info("Este livro já está na sua biblioteca");
        setAdicionados((s) => new Set(s).add(key));
        return;
      }
      const msg = error.message?.includes("ranking_clube") || error.message?.includes("refresh")
        ? "Erro ao atualizar ranking. Tente novamente."
        : `Não foi possível adicionar: ${error.message}`;
      return toast.error(msg);
    }
    toast.success(status === "lido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler");
    setAdicionados((s) => new Set(s).add(key));
    qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
    qc.invalidateQueries({ queryKey: ["meus-livros"] });
    qc.invalidateQueries({ queryKey: ["meu-livro-obra"] });
    qc.invalidateQueries({ queryKey: ["livro-detalhe"] });
  };

  const adicionarExterno = async (b: ExternalResult, status: AddStatus) => {
    if (!user) return;
    console.log("[Busca] adicionarExterno clicado:", { titulo: b.titulo, status, generos: b.generos });
    setAdicionando(b.key);
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
      console.log("[Busca] obra registrada:", { obraId, generosPersistidos: data?.obra?.generos });

      const today = new Date().toISOString().slice(0, 10);
      const { error: insErr } = await supabase.from("usuario_livros").insert({
        user_id: user.id,
        obra_id: obraId,
        status,
        ...(status === "lido" ? { data_fim: today, data_inicio: today } : {}),
      });
      if (insErr && insErr.code !== "23505") {
        console.error("adicionarExterno insert error", { code: insErr.code, message: insErr.message, details: (insErr as any).details, hint: (insErr as any).hint });
        const msg = insErr.message?.includes("ranking_clube") || insErr.message?.includes("refresh")
          ? "Erro ao atualizar ranking. Tente novamente."
          : insErr.message;
        throw new Error(msg);
      }

      setExterno((arr) => arr.filter((x) => x.key !== b.key));
      setLocal((arr) => [
        {
          origem: "local",
          obra_id: obraId,
          titulo: b.titulo,
          autor: b.autores?.[0],
          ano: b.ano,
          capa_url: b.capa_url,
          isbn13: b.isbn13 ?? undefined,
        },
        ...arr,
      ]);
      setAdicionados((s) => new Set(s).add(b.key));
      toast.success(status === "lido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler");
      qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
      qc.invalidateQueries({ queryKey: ["meus-livros"] });
      qc.invalidateQueries({ queryKey: ["meu-livro-obra"] });
      qc.invalidateQueries({ queryKey: ["livro-detalhe"] });
    } catch (e: any) {
      console.error("adicionarExterno", e);
      toast.error(e?.message ?? "Erro ao adicionar");
    } finally {
      setAdicionando(null);
    }
  };

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
          {badge && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              · {badge}
            </span>
          )}
        </div>
      </div>
    );

    return (
      <div key={key} className="card-soft p-3 flex gap-3 items-center">
        {obraId ? (
          <button
            onClick={() => navigate(`/obras/${obraId}`)}
            className="flex gap-3 items-center flex-1 min-w-0 text-left hover-lift"
          >
            {Capa}
            {Info}
          </button>
        ) : (
          <>
            {Capa}
            {Info}
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={busy || done}
              className="rounded-xl bg-primary hover:bg-primary-hover touch-manipulation"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : done ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAdd("quero_ler"); }}>
              <BookmarkPlus className="w-4 h-4 mr-2" /> Quero ler
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAdd("lido"); }}>
              <CheckCheck className="w-4 h-4 mr-2" /> Já lido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };


  const semResultadosBusca =
    !!submitted &&
    !loadingLocal &&
    !loadingExterno &&
    !erroExterno &&
    local.length === 0 &&
    externo.length === 0;

  const filtroAtivo = filtroAutor !== "todos" || filtroEditora !== "todos" || ordenacao !== "titulo_asc";

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

      {/* Controles de ordenação e filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as Ordenacao)}>
          <SelectTrigger className="h-9 rounded-xl w-auto min-w-[150px] gap-2 text-sm">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="titulo_asc">Título (A→Z)</SelectItem>
            <SelectItem value="titulo_desc">Título (Z→A)</SelectItem>
            <SelectItem value="autor_asc">Autor (A→Z)</SelectItem>
            <SelectItem value="autor_desc">Autor (Z→A)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroAutor} onValueChange={setFiltroAutor}>
          <SelectTrigger className="h-9 rounded-xl w-auto min-w-[130px] text-sm">
            <SelectValue placeholder="Autor" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="todos">Todos os autores</SelectItem>
            {autoresOpts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroEditora} onValueChange={setFiltroEditora}>
          <SelectTrigger className="h-9 rounded-xl w-auto min-w-[130px] text-sm">
            <SelectValue placeholder="Editora" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="todos">Todas as editoras</SelectItem>
            {editorasOpts.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtroAtivo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => {
              setOrdenacao("titulo_asc");
              setFiltroAutor("todos");
              setFiltroEditora("todos");
            }}
          >
            <X className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>


      {/* Acervo (sem termo) */}
      {mostrandoAcervo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Acervo {acervoOrdenado.length > 0 && `(${acervoOrdenado.length})`}
          </h2>
          {loadingAcervo ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando acervo…
            </p>
          ) : acervoOrdenado.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum livro encontrado com esses filtros.
            </p>
          ) : (
            <>
              {acervoOrdenado.slice(0, visiveis).map((r) =>
                renderCard(
                  r.obra_id,
                  r.capa_url,
                  r.titulo,
                  r.autor,
                  r.ano,
                  (status) => adicionarLocal(r.obra_id, r.obra_id, status),
                  adicionando === r.obra_id,
                  adicionados.has(r.obra_id),
                  undefined,
                  r.obra_id,
                ),
              )}
              {visiveis < acervoOrdenado.length && (
                <Button
                  variant="outline"
                  className="rounded-xl mt-2"
                  onClick={() => setVisiveis((v) => v + PAGE_SIZE)}
                >
                  Carregar mais
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {/* Busca textual */}
      {!!submitted && loadingLocal && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Buscando no acervo…
        </p>
      )}

      {local.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            No acervo
          </h2>
          {local.map((r) =>
            renderCard(
              r.obra_id,
              r.capa_url,
              r.titulo,
              r.autor,
              r.ano,
              (status) => adicionarLocal(r.obra_id, r.obra_id, status),
              adicionando === r.obra_id,
              adicionados.has(r.obra_id),
              undefined,
              r.obra_id,
            ),
          )}
        </section>
      )}

      {local.length > 0 && externo.length === 0 && !loadingExterno && !erroExterno && (
        <Button
          variant="outline"
          onClick={handleBuscarExterno}
          className="rounded-xl self-center"
        >
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
              b.key,
              b.capa_url,
              b.titulo,
              b.autores[0],
              b.ano,
              (status) => adicionarExterno(b, status),
              adicionando === b.key,
              adicionados.has(b.key),
              b.fonte,
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
          <p className="text-sm text-muted-foreground text-center">
            Nenhum livro encontrado.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/cadastro-manual")}
            className="rounded-xl"
          >
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
    </div>
  );
};

export default Busca;
