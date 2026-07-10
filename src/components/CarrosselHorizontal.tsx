import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** classes extras para o container de scroll */
  className?: string;
}

// Carrossel horizontal com swipe no mobile e setas de navegação no desktop
// (md+), onde não há gesto de arrastar e a barra de rolagem fica oculta.
export const CarrosselHorizontal = ({ children, className }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [podeEsquerda, setPodeEsquerda] = useState(false);
  const [podeDireita, setPodeDireita] = useState(false);

  const atualizarSetas = () => {
    const el = scrollRef.current;
    if (!el) return;
    setPodeEsquerda(el.scrollLeft > 4);
    setPodeDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // Sem array de deps: reavalia a cada render (conteúdo assíncrono muda o scrollWidth)
  useEffect(atualizarSetas);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", atualizarSetas, { passive: true });
    const ro = new ResizeObserver(atualizarSetas);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", atualizarSetas);
      ro.disconnect();
    };
  }, []);

  const rolar = (direcao: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direcao * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-2",
          className
        )}
      >
        {children}
      </div>

      {podeEsquerda && (
        <button
          onClick={() => rolar(-1)}
          aria-label="Rolar para a esquerda"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 z-10 w-9 h-9 rounded-full bg-card border border-border shadow-elevated items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {podeDireita && (
        <button
          onClick={() => rolar(1)}
          aria-label="Rolar para a direita"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 z-10 w-9 h-9 rounded-full bg-card border border-border shadow-elevated items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
