import { useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoNamzu from "@/assets/logo-namzu.png";

const MIN_SEL = 3;
const MAX_SEL = 5;

type Tema = {
  id: string;
  nome: string;
  icone: string | null;
  descricao: string | null;
};

const OnboardingInteresses = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: temas = [], isLoading } = useQuery({
    queryKey: ["interesses-tema"],
    enabled: !!user,
    queryFn: async (): Promise<Tema[]> => {
      const { data, error } = await supabase
        .from("interesses")
        .select("id,nome,icone,descricao")
        .eq("categoria", "tema")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jaTem, isLoading: chk } = useQuery({
    queryKey: ["perfil-interesses-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("perfil_interesses")
        .select("interesse_id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return (count ?? 0) > 0;
    },
  });

  const count = selected.size;
  const canContinue = count >= MIN_SEL && count <= MAX_SEL;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SEL) next.add(id);
      else toast.info(`Máximo de ${MAX_SEL} temas.`);
      return next;
    });
  };

  const handleSalvar = async () => {
    if (!user || !canContinue) return;
    setSaving(true);
    try {
      const rows = Array.from(selected).map((interesse_id) => ({
        user_id: user.id,
        interesse_id,
        peso: 100,
      }));
      // ON CONFLICT DO NOTHING — evita duplicidades
      const { error } = await supabase
        .from("perfil_interesses")
        .upsert(rows, { onConflict: "user_id,interesse_id", ignoreDuplicates: true });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["perfil-interesses"] });
      await qc.invalidateQueries({ queryKey: ["perfil-interesses-count"] });
      toast.success("Seu Código ME foi iniciado!");
      navigate("/perfil", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar interesses.");
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !user) return <Navigate to="/onboarding" replace />;
  if (!chk && jaTem) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-paper">
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <header className="flex items-center gap-3 mb-8">
          <img src={logoNamzu} alt="NAMZU" className="w-9 h-9" />
          <span className="font-extrabold text-primary text-lg tracking-tight">NAMZU</span>
        </header>

        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Código ME do Leitor
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
            Quais temas mais despertam sua <span className="text-gradient-warm">curiosidade</span>?
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">
            Escolha entre <strong>{MIN_SEL} e {MAX_SEL} temas</strong> para iniciar seu Código ME.
            Com o tempo, suas leituras, aprendizados e hábitos irão refiná-lo automaticamente.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : temas.length === 0 ? (
          <div className="card-soft p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum tema disponível no momento. Tente novamente em instantes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {temas.map((t) => {
              const isOn = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-pressed={isOn}
                  className={cn(
                    "relative text-left rounded-2xl border p-4 transition-all hover-lift",
                    "flex flex-col gap-1.5 min-h-[120px]",
                    isOn
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  {isOn && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div className="text-2xl leading-none">{t.icone || "✨"}</div>
                  <div className="font-semibold text-sm leading-tight">{t.nome}</div>
                  {t.descricao && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2">{t.descricao}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-paper border-t border-border/60 shadow-elevated">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Selecionados: <strong className="text-foreground">{count}</strong> de {MAX_SEL}
          </p>
          <Button
            onClick={handleSalvar}
            disabled={!canContinue || saving}
            className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary-hover"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingInteresses;
