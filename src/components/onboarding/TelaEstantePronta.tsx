import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { BookOpen, CheckCircle2, Circle, Sparkles, Users } from "lucide-react";

type Clube = { clube_id: string; nome: string; descricao: string };
type Obra = { id: string; titulo_original: string; capa_padrao_url: string | null };

interface Props {
  onAvancar: () => void;
}

function BookCard({ obra }: { obra: Obra }) {
  return (
    <div className="rounded-lg overflow-hidden bg-secondary/50 aspect-[2/3]">
      {obra.capa_padrao_url ? (
        <img
          src={obra.capa_padrao_url}
          alt={obra.titulo_original}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary/30" />
        </div>
      )}
    </div>
  );
}

export function TelaEstantePronta({ onAvancar }: Props) {
  const { generos, objetivo, livrosAmados, setClubesSelecionados } = useOnboardingStore();
  const [clubes, setClubes] = useState<Clube[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [livrosSelecionados, setLivrosSelecionados] = useState<Obra[]>([]);
  const [sugestoes, setSugestoes] = useState<Obra[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const generosParaUsar = generos.length > 0 ? generos : ["ficcao"];
    const objetivoParaUsar = objetivo ?? "descobrir";

    async function carregar() {
      const [clubesRes, generosRes] = await Promise.all([
        supabase.rpc("match_clubes_por_gosto", {
          p_generos: generosParaUsar,
          p_objetivo: objetivoParaUsar,
        }),
        supabase.from("generos").select("id").in("slug", generosParaUsar),
      ]);

      if (clubesRes.data) {
        setClubes(clubesRes.data);
        // todos selecionados por padrão
        setMarcados(new Set(clubesRes.data.map((c: Clube) => c.clube_id)));
      }

      if (livrosAmados.length > 0) {
        const { data } = await supabase
          .from("obras")
          .select("id, titulo_original, capa_padrao_url")
          .in("id", livrosAmados);
        if (data) setLivrosSelecionados(data);
      }

      const ids = (generosRes.data ?? []).map((g: { id: string }) => g.id);
      if (ids.length > 0) {
        const { data } = await supabase
          .from("obra_generos")
          .select("obra_id, obras(id, titulo_original, capa_padrao_url)")
          .in("genero_id", ids)
          .limit(20);

        const excluir = new Set<string>(livrosAmados);
        const lista: Obra[] = [];
        for (const row of data ?? []) {
          const obra = (row as any).obras as Obra | null;
          if (obra && !excluir.has(obra.id)) {
            excluir.add(obra.id);
            lista.push(obra);
            if (lista.length >= 3) break;
          }
        }
        setSugestoes(lista);
      }

      setCarregando(false);
    }
    carregar();
    // executa somente na montagem: carrega sugestões com o estado do onboarding
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleClube = (id: string) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAvancar = () => {
    setClubesSelecionados(Array.from(marcados));
    onAvancar();
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm text-primary font-medium">Pronto!</p>
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          Montei sua estante.
        </h2>
        <p className="text-muted-foreground mb-6">
          Seus livros e sugestões no seu gosto.
        </p>

        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {livrosSelecionados.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Seus livros
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {livrosSelecionados.map((obra) => (
                    <BookCard key={obra.id} obra={obra} />
                  ))}
                </div>
              </div>
            )}

            {sugestoes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Sugestões
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sugestoes.map((obra) => (
                    <BookCard key={obra.id} obra={obra} />
                  ))}
                </div>
              </div>
            )}

            {clubes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Clubes pra você
                </p>
                <div className="flex flex-col gap-2">
                  {clubes.map((c) => {
                    const ativo = marcados.has(c.clube_id);
                    return (
                      <button
                        key={c.clube_id}
                        onClick={() => toggleClube(c.clube_id)}
                        aria-pressed={ativo}
                        className={[
                          "flex items-center gap-3 w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          ativo
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background opacity-50",
                        ].join(" ")}
                      >
                        <Users className={["w-4 h-4 shrink-0", ativo ? "text-primary" : "text-muted-foreground"].join(" ")} />
                        <div className="min-w-0 flex-1">
                          <p className={["text-sm font-semibold truncate", ativo ? "" : "text-muted-foreground"].join(" ")}>
                            {c.nome}
                          </p>
                          {c.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {c.descricao}
                            </p>
                          )}
                        </div>
                        {ativo
                          ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                      </button>
                    );
                  })}
                </div>
                {marcados.size < clubes.length && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Você pode entrar nos clubes desmarcados depois, quando quiser.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8">
        <Button
          onClick={handleAvancar}
          className="h-[52px] w-full rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Guardar minha estante
        </Button>
      </div>
    </div>
  );
}
