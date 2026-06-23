import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { Objetivo } from "@/stores/onboardingStore";
import { BookOpen, Sparkles, Users } from "lucide-react";

const OPCOES: { valor: Objetivo; titulo: string; descricao: string; Icone: React.ElementType }[] = [
  {
    valor: "ler_mais",
    titulo: "Ler mais este ano",
    descricao: "Metas de leitura e hábitos consistentes.",
    Icone: BookOpen,
  },
  {
    valor: "descobrir",
    titulo: "Descobrir livros novos",
    descricao: "Recomendações personalizadas pro seu gosto.",
    Icone: Sparkles,
  },
  {
    valor: "comunidade",
    titulo: "Trocar ideia com gente",
    descricao: "Clubes de leitura e discussões literárias.",
    Icone: Users,
  },
];

interface Props {
  onAvancar: () => void;
  onPular: () => void;
}

export function QuizObjetivo({ onAvancar, onPular }: Props) {
  const { objetivo: objetivoStore, setObjetivo } = useOnboardingStore();
  const [selecionado, setSelecionado] = useState<Objetivo | null>(objetivoStore);

  const continuar = () => {
    if (selecionado) setObjetivo(selecionado);
    onAvancar();
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      <div className="flex-1">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          O que te traz pro Namzu?
        </h2>
        <p className="text-muted-foreground mb-6">
          Sem resposta errada. Você pode mudar isso depois.
        </p>

        <div className="flex flex-col gap-3">
          {OPCOES.map(({ valor, titulo, descricao, Icone }) => {
            const ativo = selecionado === valor;
            return (
              <button
                key={valor}
                onClick={() => setSelecionado(valor)}
                aria-pressed={ativo}
                className={[
                  "flex items-center gap-4 w-full rounded-2xl border p-4 text-left transition-colors",
                  ativo
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40",
                ].join(" ")}
              >
                <Icone
                  className={["w-6 h-6 shrink-0", ativo ? "text-primary" : "text-muted-foreground"].join(" ")}
                />
                <div>
                  <p className="font-semibold text-foreground text-sm">{titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <Button
          onClick={continuar}
          disabled={!selecionado}
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
