import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { BookOpen, Quote, Flame, FileText, Activity } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useLivrosPorMes,
  useGenerosLidos,
  useStatsLeitura,
  useInteracoesDiarias,
} from "@/hooks/useEstatisticas";
import { cn } from "@/lib/utils";

// Palette that maps to our design tokens (resolved at runtime from CSS vars)
function getCSSVar(name: string) {
  if (typeof window === "undefined") return "#1A3B8B";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// ─── Gráfico de barras: livros por mês ───────────────────────────────────────

function GraficoLivrosPorMes({ userId }: { userId?: string }) {
  const { data = [], isLoading } = useLivrosPorMes(userId);

  // Fill all 12 months even if no books that month
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    return format(d, "yyyy-MM");
  });

  const chartData = meses.map((mes) => {
    const found = data.find((d) => d.mes === mes);
    const label = format(parse(mes, "yyyy-MM", new Date()), "MMM", { locale: ptBR });
    return { mes: label, total: found?.total ?? 0 };
  });

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-muted animate-pulse" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center rounded-xl bg-muted/40">
        <p className="text-xs text-muted-foreground">Sem dados de leitura ainda</p>
      </div>
    );
  }

  const max = Math.max(...chartData.map((d) => d.total), 1);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          domain={[0, max + 1]}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--foreground))",
          }}
          formatter={(v: number) => [`${v} livro${v !== 1 ? "s" : ""}`, ""]}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.total > 0
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted))"
              }
              opacity={entry.total > 0 ? 1 : 0.4}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Donut: gêneros lidos ────────────────────────────────────────────────────

// Color ramp using primary + accent family
const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(223 55% 55%)",
  "hsl(157 55% 60%)",
  "hsl(207 60% 50%)",
  "hsl(270 45% 60%)",
  "hsl(35 70% 60%)",
  "hsl(4 65% 60%)",
];

function GraficoGeneros({ userId }: { userId?: string }) {
  const { data = [], isLoading } = useGenerosLidos(userId);

  if (isLoading) {
    return <div className="h-44 rounded-xl bg-muted animate-pulse" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center rounded-xl bg-muted/40">
        <p className="text-xs text-muted-foreground">Nenhum gênero registrado</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="genero"
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={68}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--foreground))",
          }}
          formatter={(v: number, name: string) => [`${v} livro${v !== 1 ? "s" : ""}`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, color: "hsl(var(--foreground))" }}
          formatter={(value) =>
            value.length > 14 ? value.slice(0, 13) + "…" : value
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Interações diárias ──────────────────────────────────────────────────────
// Percentual de uso do dia: progresso de leitura = 50, feed = 25, livro lido = 25

const ROTULOS_CATEGORIA: Record<string, string> = {
  progresso: "Progresso de leitura",
  feed: "Post no feed",
  livro_lido: "Livro concluído",
};

function InteracoesDiarias({ userId }: { userId?: string }) {
  const DIAS = 14;
  const { data = [], isLoading } = useInteracoesDiarias(userId, DIAS);

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  const porDia = new Map(data.map((d) => [d.dia, d]));

  // Últimos N dias, do mais novo para o mais antigo, preenchendo zeros
  const linhas = Array.from({ length: DIAS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = format(d, "yyyy-MM-dd");
    const registro = porDia.get(chave);
    return {
      chave,
      rotulo: format(d, "EEE dd/MM", { locale: ptBR }),
      percentual: registro?.percentual ?? 0,
      categorias: registro?.categorias ?? "",
    };
  });

  const tudoZerado = linhas.every((l) => l.percentual === 0);
  if (tudoZerado) {
    return (
      <div className="h-24 flex items-center justify-center rounded-xl bg-muted/40">
        <p className="text-xs text-muted-foreground">
          Nenhuma interação nos últimos {DIAS} dias
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {linhas.map((l) => (
        <div
          key={l.chave}
          className="flex items-center gap-2"
          title={
            l.categorias
              ? l.categorias
                  .split(", ")
                  .map((c) => ROTULOS_CATEGORIA[c] ?? c)
                  .join(" · ")
              : "Sem interações"
          }
        >
          <span className="w-20 shrink-0 text-[11px] text-muted-foreground capitalize">
            {l.rotulo}
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                l.percentual >= 75
                  ? "bg-primary"
                  : l.percentual >= 50
                  ? "bg-primary/70"
                  : "bg-primary/40",
              )}
              style={{ width: `${l.percentual}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-medium">
            {l.percentual}%
          </span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
        <Activity className="w-3 h-3" />
        Progresso de leitura vale 50%, post no feed 25% e livro concluído 25%.
      </p>
    </div>
  );
}

// ─── Stats numéricos ─────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-card border border-border/50",
        className
      )}
    >
      <Icon className="w-4 h-4 text-primary/70" />
      <span className="font-display text-2xl font-bold leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Componente raiz exportado ───────────────────────────────────────────────

interface EstatisticasLeituraProps {
  userId?: string;
  mostrar?: boolean; // respeita perfis.mostrar_estatisticas
}

export function EstatisticasLeitura({
  userId,
  mostrar = true,
}: EstatisticasLeituraProps) {
  const { data: stats, isLoading: statsLoading } = useStatsLeitura(userId);

  if (!mostrar) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Stats numéricos ── */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Resumo</h3>
        {statsLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              icon={BookOpen}
              value={stats?.total_lidos ?? 0}
              label="Livros lidos"
            />
            <StatCard
              icon={FileText}
              value={
                stats?.paginas_estimadas
                  ? stats.paginas_estimadas >= 1000
                    ? `${(stats.paginas_estimadas / 1000).toFixed(1)}k`
                    : stats.paginas_estimadas
                  : 0
              }
              label="Páginas est."
            />
            <StatCard
              icon={Flame}
              value={stats?.streak_atual ?? 0}
              label="Sequência"
            />
            <StatCard
              icon={Quote}
              value={stats?.total_citacoes ?? 0}
              label="Citações"
            />
          </div>
        )}
      </div>

      {/* ── Interações diárias ── */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Interações diárias</h3>
        <InteracoesDiarias userId={userId} />
      </div>

      {/* ── Livros por mês ── */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Livros lidos por mês</h3>
        <GraficoLivrosPorMes userId={userId} />
      </div>

      {/* ── Gêneros ── */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Gêneros favoritos</h3>
        <GraficoGeneros userId={userId} />
      </div>
    </div>
  );
}
