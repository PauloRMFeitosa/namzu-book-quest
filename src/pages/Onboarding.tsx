import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import slide1 from "@/assets/onboarding/slide-1.png";
import slide2 from "@/assets/onboarding/slide-2.png";
import slide3 from "@/assets/onboarding/slide-3.png";

const ONBOARDING_FLAG = "namzu_onboarding_completed";

const slides = [
  { image: slide1, alt: "Sua vida de leitor, organizada" },
  { image: slide2, alt: "Leia junto com pessoas que compartilham seus interesses" },
  { image: slide3, alt: "Individual para organizar. Comunitário para evoluir." },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Allow logged-in users to view onboarding; only redirect once flagged.
  const completed = typeof window !== "undefined" && localStorage.getItem(ONBOARDING_FLAG) === "1";
  if (!loading && user && completed) return <Navigate to="/" replace />;

  const isLast = index === slides.length - 1;

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_FLAG, "1"); } catch {}
    navigate(user ? "/" : "/signup");
  };

  const skip = () => {
    try { localStorage.setItem(ONBOARDING_FLAG, "1"); } catch {}
    navigate(user ? "/" : "/login");
  };

  const next = () => (isLast ? finish() : setIndex((i) => i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && !isLast) setIndex((i) => i + 1);
      if (dx > 0 && index > 0) setIndex((i) => i - 1);
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Skip */}
      <button
        onClick={skip}
        className="absolute top-4 right-5 z-20 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg"
        aria-label="Pular onboarding"
      >
        Pular
      </button>

      {/* Slides viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              className="min-w-full h-full flex items-start justify-center px-2 sm:px-6 pt-2 pb-44"
            >
              <img
                src={s.image}
                alt={s.alt}
                className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom overlay: dots + CTA */}
      <div className="absolute bottom-0 inset-x-0 z-20 pb-6 pt-4 px-5 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="flex justify-center gap-2 mb-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/40"
              )}
            />
          ))}
        </div>

        <div className="max-w-md mx-auto flex flex-col gap-3">
          <Button
            onClick={next}
            className="h-[52px] text-base font-semibold rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active shadow-elevated"
          >
            <span className="flex-1 text-center">{isLast ? "Começar agora" : "Continuar"}</span>
            <ArrowRight className="w-5 h-5" />
          </Button>

          {isLast && (
            <Button
              onClick={() => {
                try { localStorage.setItem(ONBOARDING_FLAG, "1"); } catch {}
                navigate("/login");
              }}
              variant="outline"
              className="h-[52px] text-base font-semibold rounded-2xl border-2"
            >
              Já tenho conta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
