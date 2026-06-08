import { Users, Lock, Crown, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Microgrupo,
  useEntrarMicrogrupo,
  useMicrogrupoMembros,
  useSairMicrogrupo,
} from "@/hooks/clubes/useMicrogrupos";
import { useAuth } from "@/hooks/useAuth";

export const MicrogrupoCard = ({
  grupo,
  clubeId,
  isMembroClube,
}: {
  grupo: Microgrupo;
  clubeId: string;
  isMembroClube: boolean;
}) => {
  const { user } = useAuth();
  const { data: membros = [] } = useMicrogrupoMembros(grupo.id);
  const entrar = useEntrarMicrogrupo(clubeId);
  const sair = useSairMicrogrupo(clubeId);

  const lotado =
    grupo.limite_membros != null && grupo.membros_count >= grupo.limite_membros;
  const isLider = grupo.criado_por === user?.id;
  const tipoLabel =
    grupo.tipo === "rotativo" ? "Rotativo" : grupo.tipo === "evento" ? "Por evento" : "Fixo";

  return (
    <article className="card-soft p-5 flex flex-col gap-4 hover-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-base font-semibold leading-tight">
              {grupo.nome}
            </h3>
            {grupo.privado && (
              <Lock className="w-3.5 h-3.5 text-muted-foreground" aria-label="Privado" />
            )}
            {isLider && (
              <Badge variant="secondary" className="rounded-full text-[10px] gap-1 px-2">
                <Crown className="w-3 h-3" /> Líder
              </Badge>
            )}
          </div>
          {grupo.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {grupo.descricao}
            </p>
          )}
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] shrink-0">
          {tipoLabel}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>
            {grupo.membros_count}
            {grupo.limite_membros ? ` / ${grupo.limite_membros}` : ""} membros
          </span>
        </div>
        {membros.length > 0 && (
          <div className="flex -space-x-2">
            {membros.slice(0, 4).map((m: any) => (
              <Avatar
                key={m.user_id}
                className="w-6 h-6 ring-2 ring-background"
              >
                <AvatarImage src={m.perfil?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-secondary">
                  {(m.perfil?.nome_exibicao ?? "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {membros.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-medium">
                +{membros.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex">
        {grupo.is_membro ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => sair.mutate(grupo.id)}
            disabled={sair.isPending || isLider}
            className="rounded-xl ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" /> {isLider ? "Liderando" : "Sair"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => entrar.mutate(grupo.id)}
            disabled={entrar.isPending || lotado || !isMembroClube}
            className="rounded-xl ml-auto bg-primary hover:bg-primary-hover"
          >
            <LogIn className="w-3.5 h-3.5" /> {lotado ? "Lotado" : "Entrar"}
          </Button>
        )}
      </div>
    </article>
  );
};
