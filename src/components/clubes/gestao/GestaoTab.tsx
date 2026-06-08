import { useState } from "react";
import {
  Users,
  MessageSquare,
  Calendar,
  BookOpen,
  TrendingUp,
  UserPlus,
  Settings,
  ShieldOff,
  Crown,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  useGestaoStats,
  useTopContribuidores,
  useIsCurador,
  useRemoverMembro,
} from "@/hooks/clubes/useClubeGestao";
import { useMembrosClube } from "@/hooks/clubes/useMembrosClube";
import { useClube } from "@/hooks/clubes/useClube";
import { EditarClubeDialog } from "./EditarClubeDialog";
import { TrilhaGestao } from "./TrilhaGestao";

export const GestaoTab = ({ clubeId, curadorId }: { clubeId: string; curadorId: string }) => {
  const { canManage } = useIsCurador(clubeId, curadorId);
  const { data: clube } = useClube(clubeId);
  const { data: stats, isLoading: loadingStats } = useGestaoStats(clubeId);
  const { data: top, isLoading: loadingTop } = useTopContribuidores(clubeId);
  const { data: membros } = useMembrosClube(clubeId, curadorId);
  const remover = useRemoverMembro(clubeId);
  const [editOpen, setEditOpen] = useState(false);

  if (!canManage) {
    return (
      <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
        <Lock className="w-8 h-8 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold">Área do curador</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Apenas o curador deste clube tem acesso ao painel de gestão.
        </p>
      </div>
    );
  }

  const cards = [
    { label: "Membros", value: stats?.membros, icon: Users, accent: "text-primary" },
    { label: "Novos (30d)", value: stats?.novos30d, icon: UserPlus, accent: "text-accent" },
    { label: "Posts totais", value: stats?.posts, icon: MessageSquare, accent: "text-foreground" },
    { label: "Posts (7d)", value: stats?.posts7d, icon: TrendingUp, accent: "text-accent" },
    { label: "Próximos eventos", value: stats?.eventosFuturos, icon: Calendar, accent: "text-primary" },
    { label: "Conteúdos", value: stats?.conteudos, icon: BookOpen, accent: "text-foreground" },
  ];

  const naoCuradores = (membros ?? []).filter((m) => !m.is_curador);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" /> Painel do curador
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe a saúde da tribo e ajuste o clube.
          </p>
        </div>
        {clube && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="rounded-xl gap-2"
          >
            <Settings className="w-4 h-4" /> Editar clube
          </Button>
        )}
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card-soft p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <c.icon className={`w-4 h-4 ${c.accent}`} />
            </div>
            {loadingStats ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <span className="font-display text-2xl font-semibold">{c.value ?? 0}</span>
            )}
          </div>
        ))}
      </section>

      {/* Trilha de leituras */}
      <TrilhaGestao clubeId={clubeId} />

      {/* Top contribuidores */}
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-base font-semibold">Top contribuidores (30d)</h3>
        {loadingTop ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : !top?.length ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há posts suficientes para destacar contribuidores.
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {top.map((t, idx) => (
              <li
                key={t.user_id}
                className="card-soft p-3 flex items-center gap-3"
              >
                <span className="font-display text-sm font-semibold text-muted-foreground w-5">
                  {idx + 1}º
                </span>
                <Avatar className="w-9 h-9">
                  <AvatarImage src={(t.perfil as any)?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {((t.perfil as any)?.nome_exibicao ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {(t.perfil as any)?.nome_exibicao ?? (t.perfil as any)?.username ?? "Membro"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.qtd} {t.qtd === 1 ? "post" : "posts"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  ativo
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Moderação de membros */}
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-base font-semibold">Moderação de membros</h3>
        {!naoCuradores.length ? (
          <p className="text-sm text-muted-foreground">Nenhum membro adicional para gerenciar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {naoCuradores.map((m) => (
              <li
                key={m.user_id}
                className="card-soft p-3 flex items-center gap-3"
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={m.perfil?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.perfil?.nome_exibicao ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.perfil?.nome_exibicao ?? m.perfil?.username ?? "Membro"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Nv {m.nivel} · {m.xp} XP
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <ShieldOff className="w-3.5 h-3.5" /> Remover
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {m.perfil?.nome_exibicao ?? "Este membro"} perderá acesso ao clube. Esta ação pode ser revertida convidando-o novamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => remover.mutate(m.user_id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {remover.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Remover"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </section>

      {clube && (
        <EditarClubeDialog clube={clube} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  );
};
