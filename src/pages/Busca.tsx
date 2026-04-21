import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, BookOpen, Globe, Loader2, Check, BookmarkPlus, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type AddStatus = "quero_ler" | "concluido";

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
  key: string; // chave estável (isbn ou titulo+autor)
  titulo: string;
  autores: string[];
  ano: number | null;
  capa_url: string | null;
  isbn13: string | null;
  fonte: string;
}

const cache = new Map<string, { local: LocalResult[]; externo: ExternalResult[] }>();

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
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<LocalResult[]>([]);
  const [externo, setExterno] = useState<ExternalResult[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingExterno, setLoadingExterno] = useState(false);
  const [erroExterno, setErroExterno] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set());
  const lastQuery = useRef<string>("");

  const term = q.trim();
  const tooShort = term.length > 0 && term.length < 3;

  useEffect(() => {
    if (term.length < 3) {
      setLocal([]);
      setExterno([]);
      setLoadingLocal(false);
      setLoadingExterno(false);
      setErroExterno(false);
      lastQuery.current = "";
      return;
    }

    const t = setTimeout(async () => {
      if (term === lastQuery.current) return;
      lastQuery.current = term;

      const cached = cache.get(term.toLowerCase());
      if (cached) {
        setLocal(cached.local);
        setExterno(cached.externo);
        setLoadingLocal(false);
        setLoadingExterno(false);
        setErroExterno(false);
        return;
      }

      setLoadingLocal(true);
      setExterno([]);
      setErroExterno(false);
      setLoadingExterno(false);

      const termLow = term.toLowerCase();
      const termNorm = normalize(term);

      const [{ data: porTitulo }, { data: porAutor }, { data: porIsbn }] = await Promise.all([
        supabase
          .from("obras")
          .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao")
          .ilike("titulo_ordenacao", `%${termLow}%`)
          .limit(20),
        supabase
          .from("obra_autores")
          .select(
            "obra_id, autores!inner(nome_completo, nome_ordenacao), obras!inner(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)",
          )
          .ilike("autores.nome_ordenacao", `%${termNorm}%`)
          .limit(20),
        supabase
          .from("edicoes")
          .select(
            "isbn_13, obra_id, obras!inner(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)",
          )
          .ilike("isbn_13", `%${term.replace(/[-\s]/g, "")}%`)
          .limit(10),
      ]);

      const map = new Map<string, LocalResult>();
      (porTitulo ?? []).forEach((o: any) =>
        map.set(o.id, {
          origem: "local",
          obra_id: o.id,
          titulo: o.titulo_original,
          ano: o.ano_primeira_publicacao,
          capa_url: o.capa_padrao_url,
        }),
      );
      (porAutor ?? []).forEach((row: any) => {
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
      (porIsbn ?? []).forEach((row: any) => {
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

      const locais = Array.from(map.values());
      setLocal(locais);
      setLoadingLocal(false);

      // Se encontrou local, ENCERRA o fluxo (não chama API externa)
      if (locais.length > 0) {
        cache.set(termLow, { local: locais, externo: [] });
        return;
      }

      // Sem resultado local → busca externa
      setLoadingExterno(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-books", {
          body: { query: term },
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
        }));
        setExterno(results);
        cache.set(termLow, { local: [], externo: results });
      } catch (e: any) {
        console.error("search-books failed", e);
        setErroExterno(true);
        toast.error("Erro ao buscar em fontes externas");
      } finally {
        setLoadingExterno(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [term]);

  const adicionarLocal = async (obraId: string, key: string, status: AddStatus) => {
    if (!user) return;
    setAdicionando(key);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("usuario_livros").insert({
      user_id: user.id,
      obra_id: obraId,
      status,
      ...(status === "concluido" ? { data_fim: today } : {}),
    });
    setAdicionando(null);
    if (error) {
      if (error.code === "23505") return toast.info("Já está na sua lista");
      return toast.error(error.message);
    }
    toast.success(status === "concluido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler");
    setAdicionados((s) => new Set(s).add(key));
    qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
    qc.invalidateQueries({ queryKey: ["meus-livros"] });
  };

  const adicionarExterno = async (b: ExternalResult, status: AddStatus) => {
    if (!user) return;
    setAdicionando(b.key);
    try {
      const { data, error } = await supabase.functions.invoke("rapid-action", {
        body: {
          titulo: b.titulo,
          autor: b.autores?.[0] ?? null,
          isbn13: b.isbn13 ?? null,
        },
      });
      if (error) throw error;
      const obraId = data?.obra?.id ?? data?.obra_id;
      if (!obraId) throw new Error("Resposta inválida da função");

      const today = new Date().toISOString().slice(0, 10);
      const { error: insErr } = await supabase.from("usuario_livros").insert({
        user_id: user.id,
        obra_id: obraId,
        status,
        ...(status === "concluido" ? { data_fim: today } : {}),
      });
      if (insErr && insErr.code !== "23505") throw insErr;

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
      toast.success(status === "concluido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler");
      qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
      qc.invalidateQueries({ queryKey: ["meus-livros"] });
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
    autor: string | undefined,
    ano: number | null | undefined,
    onAdd: (status: AddStatus) => void,
    busy: boolean,
    done: boolean,
    badge?: string,
  ) => (
    <div key={key} className="card-soft p-3 flex gap-3 items-center">
      {capa ? (
        <img src={capa} alt="" className="w-14 h-20 rounded-md object-cover" />
      ) : (
        <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
      )}
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            disabled={busy || done}
            className="rounded-xl bg-primary hover:bg-primary-hover"
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
          <DropdownMenuItem onClick={() => onAdd("quero_ler")}>
            <BookmarkPlus className="w-4 h-4 mr-2" /> Quero ler
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAdd("concluido")}>
            <CheckCheck className="w-4 h-4 mr-2" /> Já lido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const semResultados =
    term.length >= 3 &&
    !loadingLocal &&
    !loadingExterno &&
    !erroExterno &&
    local.length === 0 &&
    externo.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Buscar livros</h1>
        <Button
          size="icon"
          onClick={() => navigate("/cadastro-manual")}
          className="rounded-full bg-primary hover:bg-primary-hover shrink-0"
          title="Cadastrar manualmente"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Título, autor ou ISBN"
          className="h-[52px] pl-12 rounded-2xl text-base"
        />
      </div>

      {tooShort && (
        <p className="text-sm text-muted-foreground">Digite ao menos 3 caracteres…</p>
      )}

      {term.length >= 3 && loadingLocal && (
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
            ),
          )}
        </section>
      )}

      {term.length >= 3 && !loadingLocal && local.length === 0 && loadingExterno && (
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
              () => adicionarExterno(b),
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

      {semResultados && (
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
    </div>
  );
};

export default Busca;
