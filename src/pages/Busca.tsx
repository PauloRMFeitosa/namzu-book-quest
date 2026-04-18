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
  obra_id: string; // já criada pela edge function
  titulo: string;
  autor?: string;
  ano?: number | null;
  capa_url?: string | null;
}

const cache = new Map<string, { local: LocalResult[]; externo: ExternalResult | null }>();

function isIsbn(s: string) {
  const digits = s.replace(/[-\s]/g, "");
  return /^\d{13}$/.test(digits) || /^\d{10}$/.test(digits);
}

const Busca = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<LocalResult[]>([]);
  const [externo, setExterno] = useState<ExternalResult | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingExterno, setLoadingExterno] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setLocal([]);
      setExterno(null);
      setLoadingLocal(false);
      setLoadingExterno(false);
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
        return;
      }

      setLoadingLocal(true);
      setExterno(null);
      setLoadingExterno(false);

      const termLow = term.toLowerCase();
      const [{ data: porTitulo }, { data: porAutor }] = await Promise.all([
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
          .ilike("autores.nome_ordenacao", `%${termLow}%`)
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

      if (locais.length === 0) {
        setLoadingExterno(true);
        try {
          // Monta payload conforme rapid-action: { isbn13, titulo, autor }
          const payload: Record<string, string> = {};
          if (isIsbn(term)) payload.isbn13 = term.replace(/[-\s]/g, "");
          else payload.titulo = term;

          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;

          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rapid-action`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify(payload),
            },
          );

          if (!res.ok) {
            const txt = await res.text();
            console.error("rapid-action HTTP", res.status, txt);
            if (res.status === 404) {
              toast.info("Livro não encontrado nas fontes externas");
            } else {
              toast.error(`Erro na busca externa (${res.status})`);
            }
            cache.set(termLow, { local: locais, externo: null });
            return;
          }

          const data = await res.json();
          // A função retorna { obra: {...}, obra_id?, ... }
          const obra = data?.obra ?? data?.data ?? data;
          const obraId = obra?.id ?? data?.obra_id;
          const ext: ExternalResult | null = obraId
            ? {
                origem: "externo",
                obra_id: obraId,
                titulo: obra?.titulo_original ?? obra?.title ?? term,
                autor: obra?.autor ?? obra?.authors?.[0] ?? undefined,
                ano: obra?.ano_primeira_publicacao ?? null,
                capa_url: obra?.capa_padrao_url ?? obra?.image ?? null,
              }
            : null;
          setExterno(ext);
          cache.set(termLow, { local: locais, externo: ext });
        } catch (e: any) {
          console.error("rapid-action fetch failed", e);
          toast.error("Erro ao conectar com a função (CORS?)");
        } finally {
          setLoadingExterno(false);
        }
      } else {
        cache.set(termLow, { local: locais, externo: null });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [q]);

  const adicionar = async (obraId: string, key: string) => {
    if (!user) return;
    setAdicionando(key);
    const { error } = await supabase.from("usuario_livros").insert({
      user_id: user.id,
      obra_id: obraId,
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

  const renderCard = (
    key: string,
    r: LocalResult | ExternalResult,
    onAdd: () => void,
    busy: boolean,
  ) => (
    <div key={key} className="card-soft p-3 flex gap-3 items-center">
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
      <Button
        size="sm"
        onClick={onAdd}
        disabled={busy}
        className="rounded-xl bg-primary hover:bg-primary-hover"
      >
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
          placeholder="Título, autor ou ISBN"
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            No acervo
          </h2>
          {local.map((r) =>
            renderCard(r.obra_id, r, () => adicionar(r.obra_id, r.obra_id), adicionando === r.obra_id),
          )}
        </section>
      )}

      {term && !loadingLocal && local.length === 0 && !loadingExterno && !externo && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum livro encontrado.</p>
      )}

      {loadingExterno && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 animate-pulse" /> Buscando em fontes externas…
        </p>
      )}

      {!loadingExterno && externo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> Encontrado na internet
          </h2>
          {renderCard(
            `ext-${externo.obra_id}`,
            externo,
            () => adicionar(externo.obra_id, `ext-${externo.obra_id}`),
            adicionando === `ext-${externo.obra_id}`,
          )}
        </section>
      )}
    </div>
  );
};

export default Busca;
