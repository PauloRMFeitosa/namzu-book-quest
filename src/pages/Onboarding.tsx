import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  BarChart3,
  Target,
  Users,
  Search,
  MessageCircle,
  Plus,
  User,
  Heart,
  ChevronRight,
  Home as HomeIcon,
  Library,
  BookMarked,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import logoNamzu from "@/assets/logo-namzu.png";

const ONBOARDING_FLAG = "namzu_onboarding_completed";

type Feature = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; tone: "mint" | "sky" };

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slidesRef = useRef<HTMLDivElement>(null);

  const completed = typeof window !== "undefined" && localStorage.getItem(ONBOARDING_FLAG) === "1";
  if (!loading && user && completed) return <Navigate to="/" replace />;

  const isLast = index === 2;

  const scrollSlidesTop = () => {
    requestAnimationFrame(() => {
      slidesRef.current?.querySelectorAll<HTMLElement>("section").forEach((s) => {
        s.scrollTop = 0;
      });
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_FLAG, "1"); } catch {}
    navigate(user ? "/" : "/signup");
  };
  const skip = () => {
    try { localStorage.setItem(ONBOARDING_FLAG, "1"); } catch {}
    navigate(user ? "/" : "/login");
  };
  const goTo = (i: number) => { setIndex(i); scrollSlidesTop(); };
  const next = () => (isLast ? finish() : goTo(index + 1));

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && !isLast) goTo(index + 1);
      if (dx > 0 && index > 0) goTo(index - 1);
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft" && index > 0) goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="relative z-10 min-h-screen flex flex-col overflow-hidden">
      {/* Decorative dots */}
      <div className="pointer-events-none absolute top-24 right-8 grid grid-cols-5 gap-1.5 opacity-40">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-56 left-4 grid grid-cols-4 gap-1.5 opacity-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={skip}
        className="absolute top-4 right-5 z-30 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg"
      >
        Pular
      </button>

      {/* Slides */}
      <div className="flex-1 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          ref={slidesRef}
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          <SlideOne />
          <SlideTwo />
          <SlideThree />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 inset-x-0 z-20 pb-4 pt-2 px-5 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="flex justify-center gap-2 mb-3">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/40")}
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
              onClick={() => { try { localStorage.setItem(ONBOARDING_FLAG, "1"); } catch {}; navigate("/login"); }}
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

/* ------------------------- Shared atoms ------------------------- */

const BrandHeader = ({ size = "md" }: { size?: "md" | "lg" }) => (
  <div className={cn("flex items-center gap-3", size === "lg" && "flex-col gap-2")}>
    <img src={logoNamzu} alt="NAMZU" className={cn(size === "lg" ? "w-20 h-20" : "w-12 h-12", "object-contain")} />
    <span className={cn("font-extrabold text-primary tracking-tight", size === "lg" ? "text-4xl" : "text-2xl")}>NAMZU</span>
  </div>
);

const FeatureRow = ({ icon: Icon, title, desc, tone }: Feature) => (
  <div className="flex items-start gap-4">
    <div
      className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
        tone === "mint" ? "bg-secondary text-success" : "bg-accent/20 text-primary",
      )}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h3 className="font-bold text-foreground text-base leading-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-snug mt-0.5">{desc}</p>
    </div>
  </div>
);

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto w-[260px] sm:w-[280px] rounded-[2.5rem] border-[10px] border-foreground/90 bg-card shadow-elevated overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/90 rounded-b-2xl z-10" />
    <div className="h-[520px] overflow-hidden bg-background">{children}</div>
  </div>
);

const MiniNav = ({ active }: { active: "Início" | "Clubes" }) => (
  <div className="absolute bottom-0 inset-x-0 bg-card border-t border-border flex items-center justify-around py-2 text-[10px]">
    {[
      { l: "Início", Icon: HomeIcon },
      { l: "Clubes", Icon: Users },
      { l: "Busca", Icon: Search },
      { l: "Livros", Icon: Library },
      { l: "Leituras", Icon: BookMarked },
      { l: "Mais", Icon: Menu },
    ].map(({ l, Icon }) => (
      <div key={l} className={cn("flex flex-col items-center gap-0.5", active === l ? "text-primary font-semibold" : "text-muted-foreground")}>
        <Icon className="w-4 h-4" />
        <span>{l}</span>
      </div>
    ))}
  </div>
);

/* --------------------------- Slide 1 --------------------------- */

const SlideOne = () => (
  <section className="min-w-full h-full overflow-y-auto px-6 sm:px-10 pt-8 pb-32">
    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
      <div className="space-y-7">
        <BrandHeader />
        <h1 className="font-display font-extrabold text-foreground text-4xl sm:text-5xl leading-[1.05] tracking-tight">
          Sua vida de<br />leitor, organizada.
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md">
          Adicione livros, acompanhe leituras e visualize seu progresso em um único lugar.
        </p>
        <div className="space-y-5 pt-2">
          <FeatureRow icon={BookOpen} tone="mint" title="Biblioteca pessoal" desc="Seus livros sempre organizados." />
          <FeatureRow icon={BarChart3} tone="sky" title="Progresso" desc="Acompanhe cada página lida." />
          <FeatureRow icon={Target} tone="mint" title="Metas" desc="Defina objetivos e mantenha a constância." />
        </div>
      </div>

      <div className="relative flex justify-center">
        <div className="absolute -inset-6 bg-gradient-glow rounded-full blur-2xl" />
        <PhoneFrame>
          <div className="relative h-full px-3 pt-3 pb-12 bg-background">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <img src={logoNamzu} alt="" className="w-5 h-5 object-contain" />
                <span className="text-xs font-extrabold text-primary">NAMZU</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-foreground" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold tracking-wider text-muted-foreground">MEUS CLUBES ATIVOS</span>
              <span className="text-[9px] text-primary">Ver todos</span>
            </div>
            <div className="space-y-2">
              {["Clube de Leitura da Loja MMC", "Clube de Leitura da Empresa"].map((t) => (
                <div key={t} className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card">
                  <div className="w-8 h-8 rounded-md bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-foreground truncate">{t}</p>
                    <p className="text-[8px] text-muted-foreground truncate">Comunidade ativa</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              ))}
            </div>
            <p className="text-[9px] font-bold tracking-wider text-muted-foreground mt-3 mb-2">LENDO AGORA</p>
            <div className="flex gap-2 p-2 rounded-xl border border-border bg-card">
              <div className="w-12 h-16 rounded bg-destructive/80" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-foreground">#UmDiaSemReclamar</p>
                <p className="text-[8px] text-muted-foreground">2021</p>
                <p className="text-[9px] text-primary mt-3 font-semibold">Continuar lendo →</p>
              </div>
            </div>
            <p className="text-[9px] font-bold tracking-wider text-muted-foreground mt-3 mb-1">PROGRESSO DO DIA</p>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-3/5 bg-primary rounded-full" />
            </div>
            <MiniNav active="Início" />
          </div>
        </PhoneFrame>
      </div>
    </div>
  </section>
);

/* --------------------------- Slide 2 --------------------------- */

const SlideTwo = () => (
  <section className="min-w-full h-full overflow-y-auto px-6 sm:px-10 pt-8 pb-32">
    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
      <div className="space-y-7">
        <BrandHeader />
        <h1 className="font-display font-extrabold text-foreground text-4xl sm:text-5xl leading-[1.05] tracking-tight">
          Leia junto com pessoas que compartilham seus <span className="text-primary">interesses.</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md">
          Participe de clubes de leitura, troque ideias e descubra novas perspectivas.
        </p>
        <div className="space-y-5 pt-2">
          <FeatureRow icon={Users} tone="mint" title="Comunidades reais" desc="Conecte-se com leitores apaixonados por livros." />
          <FeatureRow icon={Search} tone="sky" title="Encontre sua tribo" desc="Busque clubes, autores e temas que te inspiram." />
          <FeatureRow icon={MessageCircle} tone="mint" title="Conversas que importam" desc="Compartilhe ideias e mergulhe fundo em livros incríveis." />
          <FeatureRow icon={Plus} tone="sky" title="Crie seu clube" desc="Lidere, convide e construa sua própria comunidade." />
        </div>
      </div>

      <div className="relative flex justify-center">
        <div className="absolute -inset-6 bg-gradient-glow rounded-full blur-2xl" />
        <PhoneFrame>
          <div className="relative h-full px-3 pt-3 pb-12 bg-background">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <img src={logoNamzu} alt="" className="w-5 h-5 object-contain" />
                <span className="text-xs font-extrabold text-primary">NAMZU</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-foreground" />
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 mb-3">
              <p className="text-[9px] font-bold text-primary tracking-wider">✦ CLUBES DE LEITURA</p>
              <p className="text-sm font-extrabold text-foreground leading-tight mt-1">
                Encontre sua <span className="text-primary">tribo intelectual</span>
              </p>
              <p className="text-[9px] text-muted-foreground mt-1.5 leading-snug">
                Comunidades vivas para mergulhar fundo em livros, ideias e conversas que importam.
              </p>
            </div>
            <div className="h-8 rounded-full border border-border bg-card flex items-center px-3 gap-2 mb-2">
              <Search className="w-3 h-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Buscar clubes, autores, temas...</span>
            </div>
            <div className="flex gap-1.5 mb-3 overflow-hidden">
              {["Todos", "Ficção", "Filosofia", "Negócios"].map((t, i) => (
                <span key={t} className={cn("text-[8px] px-2 py-1 rounded-full whitespace-nowrap", i === 0 ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground")}>{t}</span>
              ))}
            </div>
            <button className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Criar meu clube de leitura
            </button>
            <p className="text-[10px] font-bold text-foreground mt-3">Meus clubes ativos</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-2 rounded-xl border border-border bg-card">
                  <div className={cn("w-full aspect-square rounded mb-1", i === 1 ? "bg-primary/20" : "bg-foreground/10")} />
                  <p className="text-[9px] font-bold text-foreground leading-tight">Clube de Leitura</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5">Comunidade ativa</p>
                </div>
              ))}
            </div>
            <MiniNav active="Clubes" />
          </div>
        </PhoneFrame>
      </div>
    </div>
  </section>
);

/* --------------------------- Slide 3 --------------------------- */

const SlideThree = () => (
  <section className="min-w-full h-full overflow-y-auto px-6 sm:px-10 pt-8 pb-56">

    <div className="max-w-3xl mx-auto text-center">
      <BrandHeader size="lg" />
      <p className="text-muted-foreground text-sm mt-2">A sabedoria começa aqui.</p>

      <h1 className="font-display font-extrabold text-foreground text-4xl sm:text-5xl leading-[1.05] tracking-tight mt-8">
        Do seu jeito.
        <br />
        <span className="text-primary">Do nosso jeito.</span>
      </h1>
      <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl mx-auto mt-5">
        Use o Namzu como seu espaço pessoal para organizar leituras ou como parte de comunidades que aprendem e crescem juntas.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-10 text-left">
        <div className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="absolute -top-5 -left-2 w-12 h-12 rounded-full bg-secondary text-success flex items-center justify-center shadow-soft">
            <User className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-foreground">Individual</h3>
            <p className="text-sm font-semibold text-success">quando você quiser.</p>
            <div className="h-0.5 w-12 bg-secondary mt-2" />
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Organize sua biblioteca, acompanhe seu progresso e alcance suas metas.
            </p>
            <div className="mt-4 rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full border-4 border-success/30">
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-success">72%</div>
              </div>
              <div className="text-xs">
                <p className="font-bold text-foreground">18 <span className="font-normal text-muted-foreground">livros lidos</span></p>
                <p className="font-bold text-foreground">5 <span className="font-normal text-muted-foreground">em leitura</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="absolute -top-5 -right-2 w-12 h-12 rounded-full bg-accent/20 text-primary flex items-center justify-center shadow-soft">
            <Users className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-foreground">Comunitário</h3>
            <p className="text-sm font-semibold text-primary">quando você precisar.</p>
            <div className="h-0.5 w-12 bg-accent/40 mt-2" />
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Participe de clubes, compartilhe ideias e aprenda com outros leitores apaixonados.
            </p>
            <div className="mt-4 rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary" />
                <div className="text-[11px]">
                  <p className="font-bold text-foreground leading-none">Clube de Leitura</p>
                  <p className="text-muted-foreground">Discussão ativa</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-accent/30" />
                <div className="flex-1 rounded-lg bg-muted px-2 py-1 text-[10px]">Que capítulo incrível!</div>
                <span className="text-[10px] text-destructive flex items-center gap-0.5"><Heart className="w-3 h-3 fill-current" />12</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-accent/30" />
                <div className="flex-1 rounded-lg bg-muted px-2 py-1 text-[10px]">Concordou! Mudou minha forma de pensar.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-8">
        <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-success"><BookOpen className="w-4 h-4" /></span>
        <span className="h-px w-8 bg-border" />
        <span className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center shadow-soft">
          <img src={logoNamzu} alt="" className="w-8 h-8 object-contain" />
        </span>
        <span className="h-px w-8 bg-border" />
        <span className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-primary"><Users className="w-4 h-4" /></span>
      </div>
    </div>
  </section>
);

export default Onboarding;
