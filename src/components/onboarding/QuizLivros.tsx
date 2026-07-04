import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { toast } from "sonner";
import { BookOpen, X, Search } from "lucide-react";

type Obra = {
  id: string;
  titulo_original: string;
  capa_padrao_url: string | null;
};

interface Props {
  onAvancar: () => void;
  onPular: () => void;
}

export function QuizLivros({ onAvancar, onPular }: Props) {
  const { livrosAmados, setLivrosAmados } = useOnboardingStore();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Obra[]>([]);
  const [selecionados, setSelecionados] = useState<Obra[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (livrosAmados.length > 0 && selecionados.length === 0) {
      // restaura selecionados ao montar, se já havia ids no store
      supabase
        .from("obras")
        .select("id, titulo_original, capa_padrao_url")
        .in("id", livrosAmados)
        .then(({ data }) => { if (data) setSelecionados(data); });
    }
    // executa somente na montagem: restaura a seleção persistida no store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      const q = busca.trim();
      if (q.length < 2) { setResultados([]); return; }
      setBuscando(true);
      const { data } = await supabase
        .from("obras")
        .select("id, titulo_original, capa_padrao_url")
        .ilike("titulo_original", `%${q}%`)
        .limit(8);
      setResultados(data ?? []);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(id);
  }, [busca]);

  const selecionar = (obra: Obra) => {
    if (selecionados.some((s) => s.id === obra.id) || selecionados.length >= 3) return;
    setSelecionados((prev) => [...prev, obra]);
    setBusca("");
    setResultados([]);
    toast.success(`"${obra.titulo_original}" adicionado ✦`);
  };

  const remover = (id: string) =>
    setSelecionados((prev) => prev.filter((s) => s.id !== id));

  const continuar = () => {
    setLivrosAmados(selecionados.map((s) => s.id));
    onAvancar();
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      <div className="flex-1">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          3 livros que você ama
        </h2>
        <p className="text-muted-foreground mb-6">
          Pra eu entender seu paladar.
        </p>

        {selecionados.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {selecionados.map((obra) => (
              <div
                key={obra.id}
                className="flex items-center gap-3 bg-secondary/60 rounded-xl px-3 py-2.5"
              >
                {obra.capa_padrao_url ? (
                  <img
                    src={obra.capa_padrao_url}
                    alt=""
                    className="w-7 h-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <BookOpen className="w-7 h-7 text-primary shrink-0" />
                )}
                <span className="text-sm font-medium flex-1 truncate">
                  {obra.titulo_original}
                </span>
                <button
                  onClick={() => remover(obra.id)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Remover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {selecionados.length < 3 && (
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo título…"
              className="pl-9 h-[48px] rounded-xl"
            />
          </div>
        )}

        {resultados.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden mt-1">
            {resultados.map((obra) => {
              const jaSelecionado = selecionados.some((s) => s.id === obra.id);
              return (
                <button
                  key={obra.id}
                  onClick={() => selecionar(obra)}
                  disabled={jaSelecionado || selecionados.length >= 3}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-secondary/50 text-left border-b last:border-0 border-border disabled:opacity-40 transition-colors"
                >
                  {obra.capa_padrao_url ? (
                    <img
                      src={obra.capa_padrao_url}
                      alt=""
                      className="w-8 h-11 rounded object-cover shrink-0"
                    />
                  ) : (
                    <BookOpen className="w-8 h-8 text-primary/40 shrink-0" />
                  )}
                  <span className="text-sm">{obra.titulo_original}</span>
                </button>
              );
            })}
          </div>
        )}

        {buscando && (
          <p className="text-sm text-muted-foreground mt-2 px-1">Buscando…</p>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <Button
          onClick={continuar}
          disabled={selecionados.length === 0}
          className="h-[52px] rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Continuar
        </Button>
        <Button
          variant="ghost"
          onClick={onPular}
          className="h-[52px] text-muted-foreground"
        >
          Pular
        </Button>
      </div>
    </div>
  );
}
