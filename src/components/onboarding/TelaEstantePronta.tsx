import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { BookOpen, Users, Sparkles } from "lucide-react";

type Clube = { clube_id: string; nome: string; descricao: string };
type Obra = { id: string; titulo_original: string; capa_padrao_url: string | null };

interface Props {
  onAvancar: () => void;
}

export function TelaEstantePronta({ onAvancar }: Props) {
  const { generos, objetivo } = useOnboardingStore();
  const [clubes, setClubes] = useState<Clube[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
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

      if (clubesRes.data) setClubes(clubesRes.data);

      const ids = (generosRes.data ?? []).map((g: { id: string }) => g.id);
      if (ids.length > 0) {
        const { data } = await supabase
          .from("obra_generos")
          .select("obra_id, obras(id, titulo_original, capa_padrao_url)")
          .in("genero_id", ids)
          .limit(24);

        const seen = new Set<string>();
        const lista: Obra[] = [];
        for (const row of data ?? []) {
          const obra = (row as any).obras as Obra | null;
          if (obra && !seen.has(obra.id)) {
            seen.add(obra.id);
            lista.push(obra);
            if (lista.length >= 12) break;
          }
        }
        setObras(lista);
      }
      setCarregando(false);
    }
    carregar();
  }, []);

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
          12 livros, 3 clubes e uma trilha — no seu gosto.
        </p>

        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {clubes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Clubes pra você
                </p>
                <div className="flex flex-col gap-2">
                  {clubes.map((c) => (
                    <div
                      key={c.clube_id}
                      className="flex items-center gap-3 bg-secondary/50 rounded-2xl px-4 py-3"
                    >
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{c.nome}</p>
                        {c.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {obras.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Sua estante
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {obras.map((obra) => (
                    <div
                      key={obra.id}
                      className="rounded-lg overflow-hidden bg-secondary/50 aspect-[2/3]"
                    >
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
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8">
        <Button
          onClick={onAvancar}
          className="h-[52px] w-full rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Guardar minha estante
        </Button>
      </div>
    </div>
  );
}
