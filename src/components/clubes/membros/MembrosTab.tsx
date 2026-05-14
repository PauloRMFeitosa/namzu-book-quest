import { useState, useMemo } from "react";
import { Search, Crown, Flame, Sparkles, Users, LogOut, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMembrosClube } from "@/hooks/clubes/useMembrosClube";
import { useSairClube } from "@/hooks/clubes/useClube";

export const MembrosTab = ({
  clubeId,
  curadorId,
  isMembro,
}: {
  clubeId: string;
  curadorId: string;
  isMembro: boolean;
}) => {
  const { data: membros, isLoading } = useMembrosClube(clubeId, curadorId);
  const sair = useSairClube(clubeId);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!membros) return [];
    const term = q.trim().toLowerCase();
    if (!term) return membros;
    return membros.filter((m) =>
      [m.perfil?.nome_exibicao, m.perfil?.username, m.perfil?.bio]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term))
    );
  }, [membros, q]);

  if (!isMembro) {
    return (
      <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
        <Users className="w-8 h-8 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold">Membros</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Entre no clube para conhecer quem faz parte desta tribo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Membros {membros ? <span className="text-muted-foreground font-normal">· {membros.length}</span> : null}
          </h2>
          <p className="text-xs text-muted-foreground">
            Quem dá vida a esta tribo intelectual.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair do clube
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair deste clube?</AlertDialogTitle>
              <AlertDialogDescription>
                Você perderá acesso ao feed, canais, eventos e demais conteúdos exclusivos. Pode voltar a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => sair.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {sair.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sair"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, @user ou bio…"
          className="pl-9 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="card-soft p-8 text-center border border-dashed border-border/60">
          <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <li
              key={m.user_id}
              className="card-soft p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
            >
              <Avatar className="w-12 h-12 ring-2 ring-background">
                <AvatarImage src={m.perfil?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(m.perfil?.nome_exibicao ?? m.perfil?.username ?? "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-sm truncate">
                    {m.perfil?.nome_exibicao ?? m.perfil?.username ?? "Membro"}
                  </span>
                  {m.is_curador && (
                    <Badge className="h-5 px-1.5 gap-1 bg-accent/15 text-accent border-0 text-[10px]">
                      <Crown className="w-3 h-3" /> Curador
                    </Badge>
                  )}
                </div>
                {m.perfil?.username && (
                  <span className="text-[11px] text-muted-foreground">@{m.perfil.username}</span>
                )}
                {m.perfil?.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.perfil.bio}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Sparkles className="w-3 h-3 text-accent" /> Nv {m.nivel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-accent" /> {m.xp} XP
                  </span>
                  <span>· entrou {format(new Date(m.data_entrada), "dd MMM yy", { locale: ptBR })}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
