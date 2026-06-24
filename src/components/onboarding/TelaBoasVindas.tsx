import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logoNamzu from "@/assets/logo-namzu.png";
import { BookOpen, Users } from "lucide-react";

const LIVROS_DEMO = Array.from({ length: 12 }, (_, i) => i);

interface Props {
  onAvancar: () => void;
}

export function TelaBoasVindas({ onAvancar }: Props) {
  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8">
      <div className="flex flex-col items-center gap-1 mb-8">
        <img src={logoNamzu} alt="NAMZU" className="w-14 h-14 object-contain" />
        <span className="font-display font-extrabold text-primary text-xl tracking-tight">
          NAMZU
        </span>
      </div>

      <div className="flex-1">
        <h1 className="font-display text-3xl font-bold text-foreground leading-tight mb-2">
          Sua vida de leitor,<br />num lugar só.
        </h1>
        <p className="text-muted-foreground mb-6">
          Estante, progresso e clube — tudo no seu ritmo.
        </p>

        {/* Estante demo */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {LIVROS_DEMO.map((i) => (
            <div
              key={i}
              className="bg-secondary/70 rounded-lg aspect-[2/3] flex items-center justify-center"
            >
              <BookOpen className="w-5 h-5 text-primary/30" />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-8 mb-6">
          {[
            { valor: "12", label: "livros" },
            { valor: "3", label: "clubes" },
            { valor: "1", label: "trilha" },
          ].map(({ valor, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-primary">{valor}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 bg-secondary/40 rounded-2xl px-4 py-3">
          <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-snug">
            Monte sua estante agora — sem criar conta ainda.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <Button
          onClick={onAvancar}
          className="h-[52px] rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Começar
        </Button>
        <Button variant="ghost" asChild className="h-[52px] rounded-2xl text-muted-foreground">
          <Link to="/login">Já tenho conta</Link>
        </Button>
      </div>
    </div>
  );
}
