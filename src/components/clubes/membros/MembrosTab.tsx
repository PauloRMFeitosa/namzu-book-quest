import { useState, useMemo } from "react";
import { Search, Crown, Flame, Sparkles, Users, LogOut, Loader2, Shield, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMembrosClube } from "@/hooks/clubes/useMembrosClube";
import {
  useSairClube,
  useAprovarMembro,
  useRejeitarMembro,
  useDefinirPapelMembro,
} from "@/hooks/clubes/useClube";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

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
  const aprovar = useAprovarMembro(clubeId);
  const rejeitar = useRejeitarMembro(clubeId);
  const definirPapel = useDefinirPapelMembro(clubeId);
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [q, setQ] = useState("");

  const isCurador = !!user && user.id === curadorId;
  const meuPapel = membros?.find((m) => m.user_id === user?.id)?.papel;
  const isModerador = meuPapel === "moderador";
  const canManage = isCurador || isAdmin || isModerador;

  const ativos = useMemo(() => (membros ?? []).filter((m) => m.status === "ativo"), [membros]);
  const pendentes = useMemo(() => (membros ?? []).filter((m) => m.status === "pendente"), [membros]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ativos;
    return ativos.filter((m) =>
      [m.perfil?.nome_exibicao, m.perfil?.username, m.perfil?.bio]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term))
    );
  }, [ativos, q]);

  if (!isMembro && !canManage) {
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
            Membros <span className="text-muted-foreground font-normal">· {ativos.length}</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Quem dá vida a esta tribo intelectual.
          </p>
        </div>
      </header>

      {canManage && pendentes.length > 0 && (
        <section className="card-soft p-4 border border-accent/30 bg-accent/5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-sm">
              Solicitações pendentes <span className="text-muted-foreground font-normal">· {pendentes.length}</span>
            </h3>
          </div>
          <ul className="flex flex-col gap-2">
            {pendentes.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 bg-background rounded-xl p-2.5">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={m.perfil?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.perfil?.nome_exibicao ?? m.perfil?.username ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.perfil?.nome_exibicao ?? m.perfil?.username ?? "Membro"}
                  </p>
                  {m.perfil?.username && (
                    <p className="text-[11px] text-muted-foreground truncate">@{m.perfil.username}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg gap-1"
                  disabled={rejeitar.isPending}
                  onClick={() => rejeitar.mutate(m.user_id)}
                >
                  <X className="w-3.5 h-3.5" /> Recusar
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-primary hover:bg-primary-hover gap-1"
                  disabled={aprovar.isPending}
                  onClick={() => aprovar.mutate(m.user_id)}
                >
                  <Check className="w-3.5 h-3.5" /> Aprovar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((m) => (
            <li
              key={m.user_id}
              className="card-soft p-4 flex flex-col gap-3 hover:shadow-md transition-shadow min-w-0"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Avatar className="w-12 h-12 ring-2 ring-background shrink-0">
                  <AvatarImage src={m.perfil?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.perfil?.nome_exibicao ?? m.perfil?.username ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display font-semibold text-sm truncate flex-1 min-w-0">
                      {m.perfil?.nome_exibicao ?? m.perfil?.username ?? "Membro"}
                    </span>
                    {m.is_curador && (
                      <Badge className="h-5 px-1.5 gap-1 bg-accent/15 text-accent border-0 text-[10px] shrink-0">
                        <Crown className="w-3 h-3" /> Curador
                      </Badge>
                    )}
                    {!m.is_curador && m.papel === "moderador" && (
                      <Badge className="h-5 px-1.5 gap-1 bg-primary/15 text-primary border-0 text-[10px] shrink-0">
                        <Shield className="w-3 h-3" /> Mod
                      </Badge>
                    )}
                  </div>
                  {m.perfil?.username && (
                    <span className="text-[11px] text-muted-foreground truncate">@{m.perfil.username}</span>
                  )}
                </div>
                {user?.id === m.user_id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        title="Sair do clube"
                      >
                        <LogOut className="w-3 h-3" /> Sair
                      </button>
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
                )}
              </div>

              {m.perfil?.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2">{m.perfil.bio}</p>
              )}

              <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground mt-auto">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/60 font-medium text-foreground whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-accent" /> Nv {m.nivel}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/60 whitespace-nowrap">
                  <Flame className="w-3 h-3 text-accent" /> {m.xp} XP
                </span>
                <span className="whitespace-nowrap">
                  entrou {format(new Date(m.data_entrada), "dd MMM yy", { locale: ptBR })}
                </span>
              </div>

              {canManage && !m.is_curador && user?.id !== m.user_id && (
                <Select
                  value={m.papel}
                  onValueChange={(v) =>
                    definirPapel.mutate({ userId: m.user_id, papel: v as "membro" | "moderador" })
                  }
                >
                  <SelectTrigger className="h-7 text-[11px] rounded-lg w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membro">Membro</SelectItem>
                    <SelectItem value="moderador">Moderador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
