import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpenCheck, CalendarDays, Link2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { caminhoConvite, extrairClubeDoConvite } from "@/lib/convite";
import type { EstadoEntrada } from "@/lib/entrada";
import { LogoNamzu } from "@/components/LogoNamzu";

const BENEFICIOS = [
  {
    icon: Link2,
    titulo: "Convide por um link",
    texto: "Mande no WhatsApp. Cada pessoa entra no clube com um cadastro rápido.",
  },
  {
    icon: BookOpenCheck,
    titulo: "Veja quem está lendo",
    texto: "Acompanhe o progresso de cada membro no livro do mês, sem perguntar no grupo.",
  },
  {
    icon: CalendarDays,
    titulo: "Encontros e conversa no mesmo lugar",
    texto: "Marque os encontros, organize a discussão e guarde tudo junto do livro.",
  },
];

const ESTADO_CRIAR: EstadoEntrada = { returnTo: "/?criar=1", contexto: { tipo: "criar-clube" } };

// Página pública da raiz (Fase 2): fala com quem organiza um clube de leitura.
const EntradaOrganizador = () => {
  const navigate = useNavigate();
  const [mostrarConvite, setMostrarConvite] = useState(false);
  const [linkColado, setLinkColado] = useState("");
  const [erroLink, setErroLink] = useState(false);

  const abrirConvite = (e: React.FormEvent) => {
    e.preventDefault();
    const clubeId = extrairClubeDoConvite(linkColado);
    if (!clubeId) {
      setErroLink(true);
      return;
    }
    navigate(caminhoConvite(clubeId));
  };

  return (
    <div className="relative z-10 min-h-screen bg-background">
      <div className="max-w-md mx-auto flex flex-col min-h-screen px-6 pt-10 pb-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <LogoNamzu alt="" className="w-9 h-9" />
            <span className="font-extrabold text-primary tracking-tight text-xl">NAMZU</span>
          </div>
          <Link to="/login" className="text-sm font-semibold text-primary">
            Entrar
          </Link>
        </header>

        <main className="flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent mb-3">
            <Users className="w-4 h-4" /> Para quem organiza clube de leitura
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-foreground">
            Seu clube de leitura, <span className="text-gradient-warm">organizado em um só lugar</span>
          </h1>
          <p className="text-muted-foreground mt-4">
            Chega de planilha e de recado perdido no grupo. Crie o clube, convide os membros e acompanhe a leitura de todos.
          </p>

          <ul className="flex flex-col gap-4 mt-8">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </span>
                <div>
                  <p className="font-semibold text-sm text-foreground">{b.titulo}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{b.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </main>

        <div className="flex flex-col gap-3 mt-10">
          <Button
            onClick={() => navigate("/signup", { state: ESTADO_CRIAR })}
            className="h-[52px] rounded-2xl text-base font-semibold bg-primary hover:bg-primary-hover"
          >
            Criar meu clube
          </Button>
          <p className="text-xs text-center text-muted-foreground">Grátis. Leva menos de 3 minutos.</p>

          {mostrarConvite ? (
            <form onSubmit={abrirConvite} className="card-soft p-4 flex flex-col gap-2 mt-2">
              <Label htmlFor="link-convite" className="text-sm font-semibold">
                Cole o link que você recebeu
              </Label>
              <Input
                id="link-convite"
                autoFocus
                value={linkColado}
                onChange={(e) => {
                  setLinkColado(e.target.value);
                  setErroLink(false);
                }}
                placeholder="https://www.namzu.com.br/convite/..."
                className="h-11 rounded-xl"
                aria-invalid={erroLink}
              />
              {erroLink && (
                <p className="text-xs text-destructive">
                  Não reconheci esse link. Confira se copiou o endereço inteiro enviado pelo organizador.
                </p>
              )}
              <Button type="submit" variant="outline" className="h-11 rounded-xl">
                Ver o clube
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setMostrarConvite(true)}
              className="h-[48px] rounded-2xl text-primary font-semibold"
            >
              Recebi um convite
            </Button>
          )}

          <p className="text-sm text-center text-muted-foreground mt-1">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-semibold">
              Entrar
            </Link>
          </p>
          <Link to="/termos" className="text-xs text-center text-muted-foreground underline underline-offset-2">
            Termos de Uso e Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EntradaOrganizador;
