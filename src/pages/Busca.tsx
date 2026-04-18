import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Result {
  obra_id?: string;
  titulo: string;
  autor?: string;
  capa_url?: string;
  isbn_13?: string;
}

const Busca = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // Try RPC rapid_action; fallback to direct obras search
        const rpc = await (supabase as any).rpc("rapid_action", { input_text: q });
        if (!rpc.error && Array.isArray(rpc.data)) {
          setResults(
            rpc.data.map((r: any) => ({
              obra_id: r.obra_id ?? r.id,
              titulo: r.titulo ?? r.titulo_original ?? r.title ?? "Sem título",
              autor: r.autor ?? r.author,
              capa_url: r.capa_url ?? r.capa_padrao_url ?? r.thumbnail,
              isbn_13: r.isbn_13,
            }))
          );
        } else {
          const { data } = await supabase
            .from("obras")
            .select("id, titulo_original, capa_padrao_url, ano_primeira_publicacao")
            .ilike("titulo_ordenacao", `%${q.toLowerCase()}%`)
            .limit(20);
          setResults(
            (data ?? []).map((o) => ({
              obra_id: o.id,
              titulo: o.titulo_original,
              capa_url: o.capa_padrao_url ?? undefined,
            }))
          );
        }
      } catch (e: any) {
        toast.error("Erro na busca");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const adicionar = async (r: Result) => {
    if (!user) return;
    let obraId = r.obra_id;
    if (!obraId) {
      const slug = r.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) + "-" + Date.now();
      const { data: novaObra, error: oErr } = await supabase
        .from("obras")
        .insert({
          titulo_original: r.titulo,
          titulo_ordenacao: r.titulo.toLowerCase(),
          slug,
          capa_padrao_url: r.capa_url,
        })
        .select()
        .single();
      if (oErr) return toast.error("Não foi possível criar a obra");
      obraId = novaObra.id;
    }

    const { error } = await supabase.from("usuario_livros").insert({
      user_id: user.id,
      obra_id: obraId!,
      status: "quero_ler",
    });
    if (error) {
      if (error.code === "23505") return toast.info("Já está na sua lista");
      return toast.error(error.message);
    }
    toast.success("Adicionado a Quero Ler!");
    qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
    qc.invalidateQueries({ queryKey: ["meus-livros"] });
  };

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

      {loading && <p className="text-sm text-muted-foreground">Buscando…</p>}

      {!loading && q && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado para "{q}".</p>
      )}

      <div className="flex flex-col gap-3">
        {results.map((r, i) => (
          <div key={(r.obra_id ?? "") + i} className="card-soft p-3 flex gap-3 items-center">
            {r.capa_url ? (
              <img src={r.capa_url} alt="" className="w-14 h-20 rounded-md object-cover" />
            ) : (
              <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold line-clamp-2">{r.titulo}</p>
              {r.autor && <p className="text-xs text-muted-foreground">{r.autor}</p>}
              {r.isbn_13 && <p className="text-[10px] text-muted-foreground mt-0.5">ISBN {r.isbn_13}</p>}
            </div>
            <Button size="sm" onClick={() => adicionar(r)} className="rounded-xl bg-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Busca;
