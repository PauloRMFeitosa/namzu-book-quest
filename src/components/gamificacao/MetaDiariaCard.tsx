import { useState } from "react";
import { Target, Flame, Settings2, Check, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useMetaDiaria,
  useRegistrarLeituraRapida,
} from "@/hooks/gamificacao/useMetaDiaria";
import { ConfigurarMetaDiariaDialog } from "./ConfigurarMetaDiariaDialog";

const FRASES_INCENTIVO = [
  "Um capítulo de cada vez. Você consegue!",
  "A leitura de hoje constrói o leitor de amanhã.",
  "Faltou pouco — que tal ler agora?",
  "Mantenha a chama acesa. 🔥",
];

const Anel = ({ percentual, cumprida }: { percentual: number; cumprida: boolean }) => {
  const raio = 34;
  const circ = 2 * Math.PI * raio;
  const preenchido = circ * (Math.min(100, percentual) / 100);
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
        <circle cx="40" cy="40" r={raio} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={raio}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circ}`}
          className={cumprida ? "stroke-emerald-500 transition-all" : "stroke-primary transition-all"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {cumprida ? (
          <Check className="w-8 h-8 text-emerald-500" />
        ) : (
          <span className="text-xl font-bold">{percentual}%</span>
        )}
      </div>
    </div>
  );
};

export const MetaDiariaCard = () => {
  const { data, isLoading } = useMetaDiaria();
  const registrar = useRegistrarLeituraRapida();
  const [config, setConfig] = useState(false);

  if (isLoading) {
    return <div className="card-soft p-5 h-32 animate-pulse rounded-2xl" />;
  }

  // Sem meta → estado de convite
  if (!data?.tem_meta) {
    return (
      <>
        <div className="card-soft p-5 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Crie sua meta diária de leitura</p>
            <p className="text-sm text-muted-foreground">
              Leia todo dia, ganhe ofensiva e receba lembretes para não perder o hábito.
            </p>
          </div>
          <Button className="rounded-xl" onClick={() => setConfig(true)}>
            <Target className="w-4 h-4 mr-2" /> Definir meta
          </Button>
        </div>
        <ConfigurarMetaDiariaDialog open={config} onOpenChange={setConfig} status={data} />
      </>
    );
  }

  const tipo = data.tipo_meta ?? "minutos";
  const unidade = tipo === "minutos" ? "min" : "pág";
  const realizado = Math.round(data.realizado_hoje ?? 0);
  const meta = data.valor_meta ?? 0;
  const faltante = Math.max(0, meta - realizado);
  const cumprida = Boolean(data.cumprida_hoje);
  const streak = data.streak_atual ?? 0;
  const incrementos = tipo === "minutos" ? [5, 10, 15] : [1, 5, 10];

  const registrarRapido = async (n: number) => {
    try {
      await registrar.mutateAsync(tipo === "minutos" ? { minutos: n } : { paginas: n });
      toast.success(`+${n} ${tipo === "minutos" ? "min" : "pág"} registrados! 📖`);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível registrar.");
    }
  };

  return (
    <>
      <div className="card-soft p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="font-semibold">Meta diária</span>
          </div>
          <button
            onClick={() => setConfig(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Configurar meta"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Anel percentual={data.percentual ?? 0} cumprida={cumprida} />
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold leading-tight">
              {realizado}
              <span className="text-base font-medium text-muted-foreground"> / {meta} {unidade}</span>
            </p>
            {cumprida ? (
              <p className="text-sm text-emerald-600 font-medium mt-0.5">
                Meta de hoje concluída! Mandou bem. 🎉
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-0.5">
                Faltam <span className="font-semibold text-foreground">{faltante} {unidade}</span>.{" "}
                {FRASES_INCENTIVO[realizado % FRASES_INCENTIVO.length]}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <Flame className={streak > 0 ? "w-4 h-4 text-orange-500" : "w-4 h-4 text-muted-foreground"} />
              <span className="text-sm">
                <span className="font-semibold">{streak}</span> {streak === 1 ? "dia" : "dias"} de ofensiva
              </span>
            </div>
          </div>
        </div>

        {/* Registro rápido */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Li agora:</span>
          {incrementos.map((n) => (
            <Button
              key={n}
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={registrar.isPending}
              onClick={() => registrarRapido(n)}
            >
              {registrar.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-0.5" />
                  {n} {unidade}
                </>
              )}
            </Button>
          ))}
        </div>
      </div>

      <ConfigurarMetaDiariaDialog open={config} onOpenChange={setConfig} status={data} />
    </>
  );
};
