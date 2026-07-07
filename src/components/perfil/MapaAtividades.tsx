import { useMemo } from "react";
import { useAtividadeAnual } from "@/hooks/useAtividadeAnual";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Rótulos em linhas alternadas (semana começando na segunda-feira)
const DIAS_SEMANA = ["Seg", "", "Qua", "", "Sex", "", "Dom"];

// 5 níveis de intensidade em tons da paleta primária (azul NAMZU)
const CORES_NIVEL = [
  "bg-muted/60",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Quantil de um array já ordenado */
const quantil = (ordenado: number[], q: number) =>
  ordenado[Math.min(ordenado.length - 1, Math.floor(ordenado.length * q))];

type Props = { userId?: string };

/**
 * Mapa anual de atividades de leitura (estilo contribution graph do GitHub):
 * grade de ~53 semanas × 7 dias do ano corrente, com intensidade em 5 níveis
 * de azul proporcional às páginas registradas em cada dia.
 */
export const MapaAtividades = ({ userId }: Props) => {
  const { data: atividade = {} } = useAtividadeAnual(userId);

  const { semanas, mesesLabels } = useMemo(() => {
    const ano = new Date().getFullYear();
    const inicioAno = new Date(ano, 0, 1);
    const fimAno = new Date(ano, 11, 31);

    // Recuar até a segunda-feira da semana que contém 1º de janeiro
    const cursor = new Date(inicioAno);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));

    const semanas: (Date | null)[][] = [];
    while (cursor <= fimAno) {
      const semana: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push(cursor >= inicioAno && cursor <= fimAno ? new Date(cursor) : null);
        cursor.setDate(cursor.getDate() + 1);
      }
      semanas.push(semana);
    }

    // Coluna da semana em que cada mês começa
    const mesesLabels = MESES.map((label, m) => {
      const primeiroDia = new Date(ano, m, 1);
      const coluna = semanas.findIndex((s) =>
        s.some((d) => d && d.getTime() >= primeiroDia.getTime())
      );
      return { label, coluna: Math.max(0, coluna) + 1 };
    });

    return { semanas, mesesLabels };
  }, []);

  // Limiares de intensidade por quartis dos dias com atividade
  const niveis = useMemo(() => {
    const valores = Object.values(atividade).filter((v) => v > 0).sort((a, b) => a - b);
    if (valores.length === 0) return () => 0;
    const q1 = quantil(valores, 0.25);
    const q2 = quantil(valores, 0.5);
    const q3 = quantil(valores, 0.75);
    return (total: number) => {
      if (total <= 0) return 0;
      if (total >= q3) return 4;
      if (total >= q2) return 3;
      if (total >= q1) return 2;
      return 1;
    };
  }, [atividade]);

  const hoje = new Date();

  return (
    <div className="flex flex-col gap-1">
      {/* Meses */}
      <div
        className="grid gap-px md:gap-[2px] pl-8"
        style={{ gridTemplateColumns: `repeat(${semanas.length}, minmax(0, 1fr))` }}
      >
        {mesesLabels.map((m) => (
          <span
            key={m.label}
            className="text-[9px] md:text-[10px] text-muted-foreground whitespace-nowrap"
            style={{ gridColumn: `${m.coluna} / span 4` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="relative">
        {/* Dias da semana — absoluto para acompanhar a altura da grade */}
        <div
          className="absolute inset-y-0 left-0 w-7 grid gap-px md:gap-[2px]"
          style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
        >
          {DIAS_SEMANA.map((dia, i) => (
            <span
              key={i}
              className="text-[9px] md:text-[10px] text-muted-foreground leading-none flex items-center"
            >
              {dia}
            </span>
          ))}
        </div>

        {/* Grade de dias: colunas = semanas, linhas = dias, fluxo vertical */}
        <div
          className="grid ml-8 gap-px md:gap-[2px] aspect-[53/7]"
          style={{
            gridTemplateColumns: `repeat(${semanas.length}, minmax(0, 1fr))`,
            gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            gridAutoFlow: "column",
          }}
        >
          {semanas.flat().map((dia, i) => {
            if (!dia) return <div key={i} />;
            const total = atividade[chaveDia(dia)] ?? 0;
            const futuro = dia > hoje;
            return (
              <div
                key={i}
                className={`rounded-[1.5px] md:rounded-[2px] ${
                  futuro ? "bg-muted/30" : CORES_NIVEL[niveis(total)]
                }`}
                title={
                  futuro
                    ? undefined
                    : `${total > 0 ? `${total} página${total > 1 ? "s" : ""}` : "Sem atividade"} em ${dia.toLocaleDateString("pt-BR")}`
                }
              />
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      {/* pr compensa a foto de perfil que sobrepõe o canto inferior direito */}
<div className="flex items-center justify-center gap-1.5 mt-1.5 pr-24 md:pr-28 text-[10px] text-muted-foreground">
        <span>Menos atividade</span>
        <div className="flex items-center gap-[3px]">
          {CORES_NIVEL.map((cor, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${cor}`} />
          ))}
        </div>
        <span>Mais atividade</span>
      </div>
    </div>
  );
};
