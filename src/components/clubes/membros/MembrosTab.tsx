import { useState, useMemo } from "react";
import {
  Search, Crown, Flame, Sparkles, Users, LogOut,
  Loader2, Shield, Check, X, UserX,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMembrosClube } from "@/hooks/clubes/useMembrosClube";
import {
  useSairClube, useAprovarMembro, useRejeitarMembro,
  useDefinirPapelMembro, useExpulsarMembro,
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
  const expulsar = useExpulsarMembro(clubeId);
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
      <header>
        <h2 className="font-display text-lg font-semibold">
          Membros{" "}
          <span className="text-muted-foreground font-normal text-base">· {ativos.length}</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quem dá vida a esta tribo intelectual.
        </p>
      </header>

      {/* Pendentes */}
      {canManage && pendentes.length > 0 && (
        <section className="card-soft p-4 border border-accent/30 bg-accent/5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <h3 className="font-display font-semibold text-sm">
              Solicitações pendentes{" "}
              <span className="text-muted-foreground font-normal">· {pendentes.length}</span>
            </h3>
          </div>
          <ul className="flex flex-col gap-2">
            {pendentes.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 bg-background rounded-xl p-2.5 min-w-0">
                <Avatar className="w-9 h-9 shrink-0">
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
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg text-destructive"
                    disabled={rejeitar.isPending}
                    onClick={() => rejeitar.mutate(m.user_id)}
                    title="Recusar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-primary hover:bg-primary-hover"
                    disabled={aprovar.isPending}
                    onClick={() => aprovar.mutate(m.user_id)}
                    title="Aprovar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, @user ou bio…"
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : !filtered.length ? (
        <div className="card-soft p-8 text-center border border-dashed border-border/60">
          <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((m) => {
            const nome = m.perfil?.nome_exibicao ?? m.perfil?.username ?? "Membro";
            const isMe = user?.id === m.user_id;
            const canExpel = canManage && !isMe && !m.is_curador;

            return (
              <li key={m.user_id} className="card-soft p-4 flex flex-col gap-3 min-w-0 overflow-hidden">
                {/* Linha 1: avatar + info + badge de papel */}
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar className="w-11 h-11 ring-2 ring-background shrink-0">
                    <AvatarImage src={m.perfil?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {nome.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* Nome truncado numa linha */}
                    <p className="font-display font-semibold text-sm leading-tight truncate">
                      {nome}
                    </p>
                    {m.perfil?.username && (
                      <p className="text-[11px] text-muted-foreground truncate">@{m.perfil.username}</p>
                    )}
                    {/* Badges — ficam abaixo do nome, nunca sobrepõem */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.is_curador && (
                        <Badge className="h-4 px-1.5 gap-0.5 bg-accent/15 text-accent border-0 text-[10px]">
                          <Crown className="w-2.5 h-2.5" /> Curador
                        </Badge>
                      )}
                      {!m.is_curador && m.papel === "moderador" && (
                        <Badge className="h-4 px-1.5 gap-0.5 bg-primary/15 text-primary border-0 text-[10px]">
                          <Shield className="w-2.5 h-2.5" /> Moderador
                        </Badge>
                      )}
                      {isMe && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Você</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {m.perfil?.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {m.perfil.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/60 font-medium text-foreground whitespace-nowrap">
                    <Sparkles className="w-3 h-3 text-accent shrink-0" /> Nv {m.nivel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground whitespace-nowrap">
                    <Flame className="w-3 h-3 text-accent shrink-0" /> {m.xp} XP
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    desde {format(new Date(m.data_entrada), "MMM yy", { locale: ptBR })}
                  </span>
                </div>

                {/* Ações (curador/mod) — linha separada */}
                {(canExpel || (canManage && !m.is_curador && !isMe) || isMe) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40 flex-wrap">
                    {/* Alterar papel (curador/mod) */}
                    {canManage && !m.is_curador && !isMe && (
                      <Select
                        value={m.papel}
                        onValueChange={(v) =>
                          definirPapel.mutate({ userId: m.user_id, papel: v as "membro" | "moderador" })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px] rounded-lg flex-1 min-w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="membro">Membro</SelectItem>
                          <SelectItem value="moderador">Moderador</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Expulsar (curador/mod) */}
                    {canExpel && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg text-[11px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                          >
                            <UserX className="w-3 h-3" /> Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover {nome}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {nome} perderá acesso ao clube imediatamente. Esta ação pode ser desfeita
                              aprovando o membro novamente no futuro.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => expulsar.mutate(m.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {expulsar.isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : "Remover membro"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Sair (o próprio membro) */}
                    {isMe && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                            <LogOut className="w-3 h-3" /> Sair
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Sair deste clube?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Você perderá acesso ao feed, canais e eventos exclusivos.
                              Pode voltar a qualquer momento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => sair.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {sair.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sair do clube"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
