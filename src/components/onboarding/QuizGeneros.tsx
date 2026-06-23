import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { toast } from "sonner";

const GENEROS = [
  { slug: "ficcao", label: "Ficção", emoji: "📚" },
  { slug: "negocios", label: "Negócios", emoji: "💼" },
  { slug: "autoajuda", label: "Autoajuda", emoji: "🌱" },
  { slug: "filosofia", label: "Filosofia", emoji: "🤔" },
  { slug: "psicologia", label: "Psicologia", emoji: "🧠" },
  { slug: "historia", label: "História", emoji: "🏛️" },
  { slug: "biografia", label: "Biografia", emoji: "✍️" },
  { slug: "literatura", label: "Literatura", emoji: "🖋️" },
  { slug: "jovem-adulto", label: "Jovem Adulto", emoji: "⭐" },
  { slug: "infantojuvenil", label: "Infantojuvenil", emoji: "🌈" },
  { slug: "poesia", label: "Poesia", emoji: "🎭" },
  { slug: "religiao", label: "Religião", emoji: "✨" },
];

interface Props {
  onAvancar: () => void;
  onPular: () => void;
}

export function QuizGeneros({ onAvancar, onPular }: Props) {
  const { generos: generosStore, setGeneros } = useOnboardingStore();
  const [selecionados, setSelecionados] = useState<string[]>(generosStore);

  const toggle = (slug: string) =>
    setSelecionados((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );

  const continuar = () => {
    setGeneros(selecionados);
    if (selecionados.length > 0) {
      toast.success(`+${selecionados.length * 3} livros adicionados à sua estante ✦`);
    }
    onAvancar();
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      <div className="flex-1">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          O que você curte ler?
        </h2>
        <p className="text-muted-foreground mb-6">
          Escolha à vontade. Dá pra mudar depois.
        </p>

        <div className="flex flex-wrap gap-2">
          {GENEROS.map((g) => {
            const ativo = selecionados.includes(g.slug);
            return (
              <button
                key={g.slug}
                onClick={() => toggle(g.slug)}
                aria-pressed={ativo}
                className={[
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  ativo
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/60",
                ].join(" ")}
              >
                <span aria-hidden>{g.emoji}</span>
                {g.label}
              </button>
            );
          })}
        </div>
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
