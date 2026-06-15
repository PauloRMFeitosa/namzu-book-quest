import { useState } from "react";
import {
  Plus,
  PlayCircle,
  FileText,
  Link2,
  Headphones,
  BookOpen,
  ExternalLink,
  Check,
  Lock,
  Library,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useConteudos, useRegistrarAcesso, ClubeConteudo } from "@/hooks/clubes/useConteudos";
import { CriarConteudoDialog } from "./CriarConteudoDialog";
import { VideoPlayerDialog } from "./VideoPlayerDialog";
import { useClubeMembership } from "@/hooks/clubes/useClube";
import { differenceInCalendarDays } from "date-fns";

const ICONES: Record<string, any> = {
  video: PlayCircle,
  live_gravada: Video,
  pdf: FileText,
  link: Link2,
  audio: Headphones,
  texto: BookOpen,
};

export const ConteudosTab = ({
  clubeId,
  curadorId,
  isMembro,
}: {
  clubeId: string;
  curadorId: string;
  isMembro: boolean;
}) => {
  const { user } = useAuth();
  const { data: conteudos, isLoading } = useConteudos(clubeId);
  const { data: membership } = useClubeMembership(clubeId);
  const isCurador = user?.id === curadorId;
  const [criarOpen, setCriarOpen] = useState(false);

  if (!isMembro && !isCurador) {
    return (
      <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
        <Library className="w-8 h-8 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold">Conteúdos</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Entre no clube para acessar a biblioteca curada pelo criador.
        </p>
      </div>
    );
  }

  const proximaOrdem = (conteudos?.length ?? 0) + 1;
  const diasNoClube = membership?.data_entrada
    ? differenceInCalendarDays(new Date(), new Date(membership.data_entrada))
    : 9999;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Conteúdos {conteudos ? <span className="text-muted-foreground font-normal">· {conteudos.length}</span> : null}
          </h2>
          <p className="text-xs text-muted-foreground">
            Material curado especialmente para os membros desta tribo.
          </p>
        </div>
        {isCurador && (
          <Button
            onClick={() => setCriarOpen(true)}
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary-hover shrink-0"
          >
            <Plus className="w-4 h-4" /> Publicar
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !conteudos?.length ? (
        <div className="card-soft p-8 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
          <Library className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-md">
            {isCurador
              ? "Publique o primeiro conteúdo da biblioteca do clube."
              : "Ainda não há conteúdos publicados aqui."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {conteudos.map((c) => (
            <ConteudoItem
              key={c.id}
              c={c}
              diasNoClube={diasNoClube}
              isCurador={isCurador}
            />
          ))}
        </ul>
      )}

      {isCurador && (
        <CriarConteudoDialog
          open={criarOpen}
          onOpenChange={setCriarOpen}
          clubeId={clubeId}
          proximaOrdem={proximaOrdem}
        />
      )}
    </div>
  );
};

const TIPOS_LABEL: Record<string, string> = {
  video: "Vídeo",
  live_gravada: "Live gravada",
  pdf: "PDF",
  link: "Link",
  audio: "Áudio",
  texto: "Texto",
};

const TIPOS_VIDEO = new Set(["video", "live_gravada"]);

const ConteudoItem = ({
  c,
  diasNoClube,
  isCurador,
}: {
  c: ClubeConteudo;
  diasNoClube: number;
  isCurador: boolean;
}) => {
  const Icon = ICONES[c.tipo] ?? BookOpen;
  const registrar = useRegistrarAcesso();
  const bloqueado = !isCurador && diasNoClube < c.liberado_apos_dias;
  const diasFaltam = c.liberado_apos_dias - diasNoClube;
  const [playerOpen, setPlayerOpen] = useState(false);

  const isVideo = TIPOS_VIDEO.has(c.tipo);

  const abrir = () => {
    if (bloqueado) return;
    if (!c.acessado_por_mim) registrar.mutate(c.id);
    if (isVideo) {
      setPlayerOpen(true);
    } else {
      window.open(c.url_conteudo, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <li
        className={`card-soft p-4 flex items-center gap-4 transition-shadow ${
          bloqueado ? "opacity-60" : "hover:shadow-md cursor-pointer"
        }`}
        onClick={abrir}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center text-white shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              #{c.ordem_liberacao}
            </span>
            <h3 className="font-display font-semibold text-sm truncate">{c.titulo}</h3>
            {c.acessado_por_mim && !bloqueado && (
              <Badge className="h-5 px-1.5 gap-1 bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">
                <Check className="w-3 h-3" /> Visto
              </Badge>
            )}
            {bloqueado && (
              <Badge className="h-5 px-1.5 gap-1 bg-muted text-muted-foreground border-0 text-[10px]">
                <Lock className="w-3 h-3" /> {diasFaltam}d
              </Badge>
            )}
          </div>
          {c.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
            <span>{TIPOS_LABEL[c.tipo] ?? c.tipo}</span>
            <span>· {c.acessos_count} acessos</span>
          </div>
        </div>
        {!bloqueado && (
          isVideo
            ? <PlayCircle className="w-4 h-4 text-primary shrink-0" />
            : <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </li>

      {isVideo && (
        <VideoPlayerDialog
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          titulo={c.titulo}
          url={c.url_conteudo}
        />
      )}
    </>
  );
};
