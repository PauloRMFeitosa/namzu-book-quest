import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, BookOpen, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface LocalResult {
  origem: "local";
  obra_id: string;
  titulo: string;
  autor?: string;
  ano?: number | null;
  capa_url?: string | null;
}

interface ExternalResult {
  origem: "externo";
  source: "google" | "openlibrary";
  external_id?: string;
  titulo: string;
  autor?: string;
  autores?: string[];
  ano?: number | null;
  capa_url?: string | null;
  isbn_13?: string | null;
  editora?: string | null;
  num_paginas?: number | null;
  sinopse?: string | null;
  idioma?: string | null;
}

type Result = LocalResult | ExternalResult;

const cache = new Map<string, { local: LocalResult[]; externos: ExternalResult[] }>();

const Busca = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<LocalResult[]>([]);
  const [externos, setExternos] = useState<ExternalResult[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingExterno, setLoadingExterno] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setLocal([]);
      setExternos([]);
      setLoadingLocal(false);
      setLoadingExterno(false);
      return;
    }

    const t = setTimeout(async () => {
      if (term === lastQuery.current) return;
      lastQuery.current = term;

      const cached = cache.get(term.toLowerCase());
      if (cached) {
        setLocal(cached.local);
        setExternos(cached.externos);
        return;
      }

      setLoadingLocal(true);
      setExternos([]);
      setLoadingExterno(false);

      // 1) Busca local (titulo + autores)
      const like = `%${term}%`;
      const [{ data: porTitulo }, { data: porAutor }] = await Promise.all([
        supabase
          .from("obras")
          .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao")
          .ilike("titulo_ordenacao", `%${term.toLowerCase()}%`)
          .limit(20),
        supabase
          .from("obra_autores")
          .select("obra_id, autores!inner(nome_completo, nome_ordenacao), obras!inner(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)")
          .ilike("autores.nome_ordenacao", `%${term.toLowerCase()}%`)
          .limit(20),
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

      const locais = Array.from(map.values());
      setLocal(locais);
      setLoadingLocal(false);

      // 2) Se vazio, busca em fontes externas
      if (locais.length === 0) {
        setLoadingExterno(true);
        try {
          const { data, error } = await supabase.functions.invoke("buscar-livros", {
            body: { action: "search", titulo: term, autor: term },
          });
          if (error) throw error;
          const ext: ExternalResult[] = (data?.results ?? []).map((r: any) => ({ ...r, origem: "externo" }));
          setExternos(ext);
          cache.set(term.toLowerCase(), { local: locais, externos: ext });
        } catch (e: any) {
          toast.error("Erro ao buscar em fontes externas");
        } finally {
          setLoadingExterno(false);
        }
      } else {
        cache.set(term.toLowerCase(), { local: locais, externos: [] });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [q]);

  const adicionarLocal = async (r: LocalResult) => {
    if (!user) return;
    setAdicionando(r.obra_id);
    const { error } = await supabase.from("usuario_livros").insert({
      user_id: user.id,
      obra_id: r.obra_id,
      status: "quero_ler",
    });
    setAdicionando(null);
    if (error) {
      if (error.code === "23505") return toast.info("Já está na sua lista");
      return toast.error(error.message);
    }
    toast.success("Adicionado a Quero Ler!");
    qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
    qc.invalidateQueries({ queryKey: ["meus-livros"] });
  };

  const adicionarExterno = async (r: ExternalResult, idx: number) => {
    if (!user) return;
    const key = `ext-${idx}`;
    setAdicionando(key);
    try {
      const { data, error } = await supabase.functions.invoke("buscar-livros", {
        body: {
          action: "add",
          book: {
            source: r.source,
            external_id: r.external_id,
            titulo: r.titulo,
            autor: r.autor,
            autores: r.autores,
            ano: r.ano,
            capa_url: r.capa_url,
            isbn_13: r.isbn_13,
            editora: r.editora,
            num_paginas: r.num_paginas,
            sinopse: r.sinopse,
            idioma: r.idioma,
          },
        },
      });
      if (error) throw error;
      if (data?.duplicado) toast.info("Já está na sua lista");
      else toast.success("Livro adicionado ao acervo!");

      // Move o item para a seção local
      if (data?.obra_id) {
        setExternos((prev) => prev.filter((_, i) => i !== idx));
        setLocal((prev) => [
          {
            origem: "local",
            obra_id: data.obra_id,
            titulo: r.titulo,
            autor: r.autor,
            ano: r.ano,
            capa_url: r.capa_url,
          },
          ...prev,
        ]);
      }
      qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
      qc.invalidateQueries({ queryKey: ["meus-livros"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao adicionar");
    } finally {
      setAdicionando(null);
    }
  };

  const Card = ({ r, onAdd, busy }: { r: Result; onAdd: () => void; busy: boolean }) => (
    <div className="card-soft p-3 flex gap-3 items-center">
      {r.capa_url ? (
        <img src={r.capa_url} alt="" className="w-14 h-20 rounded-md object-cover" />
      ) : (
        <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold line-clamp-2">{r.titulo}</p>
        {r.autor && <p className="text-xs text-muted-foreground line-clamp-1">{r.autor}</p>}
        {r.ano && <p className="text-[10px] text-muted-foreground mt-0.5">{r.ano}</p>}
      </div>
      <Button size="sm" onClick={onAdd} disabled={busy} className="rounded-xl bg-primary hover:bg-primary-hover">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </div>
  );

  const term = q.trim();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Buscar livros</h1>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Título ou autor"
          className="h-[52px] pl-12 rounded-2xl text-base"
        />
      </div>

      {term && loadingLocal && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Buscando no acervo…
        </p>
      )}

      {term && !loadingLocal && local.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">No acervo</h2>
          {local.map((r) => (
            <Card key={r.obra_id} r={r} onAdd={() => adicionarLocal(r)} busy={adicionando === r.obra_id} />
          ))}
        </section>
      )}

      {term && !loadingLocal && local.length === 0 && !loadingExterno && externos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum livro encontrado no banco.</p>
      )}

      {loadingExterno && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 animate-pulse" /> Buscando em fontes externas (Google Books, Open Library)…
        </p>
      )}

      {!loadingExterno && externos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> Resultados da internet
          </h2>
          {externos.map((r, i) => (
            <Card key={`${r.source}-${r.external_id ?? i}`} r={r} onAdd={() => adicionarExterno(r, i)} busy={adicionando === `ext-${i}`} />
          ))}
        </section>
      )}
    </div>
  );
};

export default Busca;
