import { useEffect, useRef } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Loader2, Lock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubeConvite } from "@/hooks/clubes/useClubeConvite";
import { useClubeMembership, useEntrarClube } from "@/hooks/clubes/useClube";
import { caminhoConvite, extrairClubeDoConvite } from "@/lib/convite";
import type { EstadoEntrada } from "@/lib/entrada";
import { LogoNamzu } from "@/components/LogoNamzu";

// Página pública de convite (Fase 2): mostra o clube a quem recebeu o link e
// leva direto para dentro dele, com cadastro curto se a pessoa não tem conta.
const Convite = () => {
  const { id: idBruto } = useParams();
  const id = extrairClubeDoConvite(idBruto ?? "");
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: clube, isLoading, isError } = useClubeConvite(id);
  const { data: participacao, isLoading: carregandoParticipacao } = useClubeMembership(user && id ? id : undefined);
  const entrar = useEntrarClube(id ?? undefined);

  const privado = clube?.visibilidade === "privado";
  const entrarNoClube = async () => {
    const status = await entrar.mutateAsync(privado ? "pendente" : "ativo");
    if (status === "ativo") navigate(`/clubes/${id}`, { replace: true });
  };

  // Quem volta do cadastro ou do login com ?entrar=1 entra sem tocar de novo no botão.
  const entradaAutomatica = useRef(false);
  const querEntrar = search.get("entrar") === "1";
  const prontoParaEntrar = querEntrar && !!user && !!clube && !carregandoParticipacao && !participacao;
  useEffect(() => {
    if (!prontoParaEntrar || entradaAutomatica.current) return;
    entradaAutomatica.current = true;
    entrarNoClube().catch(() => {
      /* o erro já aparece no toast do hook */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prontoParaEntrar]);

  if (!id) return <ConviteInvalido />;
  if (participacao?.status === "ativo") return <Navigate to={`/clubes/${id}`} replace />;

  const carregando = isLoading || authLoading || (!!user && carregandoParticipacao);
  const estado: EstadoEntrada = {
    returnTo: `${caminhoConvite(id)}?entrar=1`,
    contexto: clube ? { tipo: "convite", nomeClube: clube.nome } : undefined,
  };
  const iniciais = (clube?.curador_nome ?? "O").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  return (
    <div className="relative z-10 min-h-screen bg-background">
      <div className="max-w-md mx-auto flex flex-col min-h-screen px-6 pt-8 pb-8">
        <Link to="/" className="flex items-center gap-2 mb-6 self-start" aria-label="NAMZU, página inicial">
          <LogoNamzu alt="" className="w-8 h-8" />
          <span className="font-extrabold text-primary tracking-tight text-lg">NAMZU</span>
        </Link>

        {carregando ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-44 rounded-[var(--radius)]" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ) : isError || !clube ? (
          <ConviteInvalido semMoldura />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">Você foi convidado para um clube de leitura</p>

            <div className="card-soft overflow-hidden">
              <div className="h-40 bg-muted">
                {clube.imagem_capa_url ? (
                  <img src={clube.imagem_capa_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-warm flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-primary-foreground/70" />
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col gap-3">
                <h1 className="font-display text-2xl font-semibold leading-tight">{clube.nome}</h1>
                {clube.descricao && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{clube.descricao}</p>
                )}

                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={clube.curador_avatar_url ?? undefined} />
                    <AvatarFallback className="bg-secondary text-xs">{iniciais || "O"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Organizado por</p>
                    <p className="text-sm font-medium truncate">{clube.curador_nome ?? "Organizador"}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {clube.membros_count} {clube.membros_count === 1 ? "membro" : "membros"}
                  </span>
                </div>

                {clube.leitura_titulo && (
                  <div className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3">
                    {clube.leitura_capa_url ? (
                      <img src={clube.leitura_capa_url} alt="" className="w-10 h-14 rounded object-cover shadow-soft" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-secondary flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Leitura do clube</p>
                      <p className="text-sm font-semibold line-clamp-2">{clube.leitura_titulo}</p>
                    </div>
                  </div>
                )}

                {privado && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
                    Clube privado: o organizador aprova cada entrada.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              {participacao?.status === "pendente" ? (
                <div className="card-soft p-4 text-center">
                  <p className="font-semibold text-sm">Pedido enviado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O organizador precisa aprovar a sua entrada. Você recebe um aviso quando for aceito.
                  </p>
                </div>
              ) : user ? (
                <Button
                  onClick={() => entrarNoClube().catch(() => {})}
                  disabled={entrar.isPending}
                  className="h-[52px] rounded-2xl text-base font-semibold bg-primary hover:bg-primary-hover"
                >
                  {entrar.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : privado ? "Pedir para entrar" : "Entrar no clube"}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => navigate("/signup", { state: estado })}
                    className="h-[52px] rounded-2xl text-base font-semibold bg-primary hover:bg-primary-hover"
                  >
                    {privado ? "Pedir para entrar" : "Entrar no clube"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Cadastro rápido: nome, e-mail e senha, ou Google.</p>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login", { state: estado })}
                    className="h-[48px] rounded-2xl text-primary font-semibold"
                  >
                    Já tenho conta
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ConviteInvalido = ({ semMoldura = false }: { semMoldura?: boolean }) => {
  const conteudo = (
    <div className="card-soft p-6 text-center flex flex-col items-center gap-3">
      <BookOpen className="w-10 h-10 text-primary" />
      <p className="font-semibold">Convite não encontrado</p>
      <p className="text-sm text-muted-foreground">
        O link pode estar incompleto ou o clube foi encerrado. Peça um novo link ao organizador.
      </p>
      <Button asChild variant="outline" className="rounded-2xl">
        <Link to="/">Ir para o início</Link>
      </Button>
    </div>
  );
  if (semMoldura) return conteudo;
  return (
    <div className="relative z-10 min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 pt-16">{conteudo}</div>
    </div>
  );
};

export default Convite;
