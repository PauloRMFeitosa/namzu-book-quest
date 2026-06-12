import { useEffect, useMemo, useRef } from "react";
import { Hash, Loader2, Trash2, Reply, CornerDownRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useThreadPadrao } from "@/hooks/clubes/useCanais";
import { useMensagens, useDeletarMensagem, type Mensagem } from "@/hooks/clubes/useMensagens";
import { MensagemComposer } from "./MensagemComposer";
import { MembrosOnline } from "./MembrosOnline";
import { useCanalUIStore } from "@/stores/canalUIStore";
import type { Canal } from "@/hooks/clubes/useCanais";

interface Props {
  clubeId: string;
  canal: Canal;
  isMembro: boolean;
}

const formatHora = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const formatDia = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export const MensagensView = ({ clubeId, canal, isMembro }: Props) => {
  const { user } = useAuth();
  const { data: threadId, isLoading: loadingThread } = useThreadPadrao(canal.id);
  const { data: mensagens, isLoading } = useMensagens(threadId);
  const deletar = useDeletarMensagem(threadId);
  const setReplyTo = useCanalUIStore((s) => s.setReplyTo);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens?.length]);

  // Map para resolver mensagens citadas
  const mapById = useMemo(() => {
    const m = new Map<string, Mensagem>();
    (mensagens ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [mensagens]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] h-full min-h-0">
      <div className="flex flex-col min-h-0 border-r border-border/60">
        {/* Header canal */}
        <div className="border-b border-border/60 px-4 py-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-accent" />
          <div className="flex flex-col min-w-0">
            <span className="font-display font-semibold leading-tight truncate">{canal.nome}</span>
            {canal.descricao && (
              <span className="text-xs text-muted-foreground truncate">{canal.descricao}</span>
            )}
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingThread || isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : !mensagens?.length ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Comece a conversa em <strong>#{canal.nome}</strong>
            </div>
          ) : (
            mensagens.map((m, idx) => {
              const prev = mensagens[idx - 1];
              const sameAuthor =
                prev &&
                prev.user_id === m.user_id &&
                new Date(m.created_at!).getTime() - new Date(prev.created_at!).getTime() < 5 * 60 * 1000;
              const dia = formatDia(m.created_at);
              const prevDia = prev ? formatDia(prev.created_at) : null;
              const showDay = dia !== prevDia;
              const replied = m.reply_to_id ? mapById.get(m.reply_to_id) : null;

              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{dia}</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                  )}
                  <div
                    className={`group flex gap-3 px-2 py-1 rounded-lg hover:bg-secondary/40 transition-all duration-200 ${
                      sameAuthor ? "" : "mt-2"
                    }`}
                  >
                    {sameAuthor ? (
                      <div className="w-9 shrink-0 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 text-right pt-1">
                        {formatHora(m.created_at)}
                      </div>
                    ) : (
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={m.autor?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(m.autor?.nome_exibicao ?? m.autor?.username ?? "?")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      {!sameAuthor && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm">
                            {m.autor?.nome_exibicao ?? m.autor?.username ?? "Anônimo"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatHora(m.created_at)}</span>
                        </div>
                      )}
                      {replied && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5 truncate">
                          <CornerDownRight className="w-3 h-3" />
                          <span className="font-medium text-foreground/70">
                            {replied.autor?.nome_exibicao ?? "Anônimo"}:
                          </span>
                          <span className="truncate">{replied.mensagem}</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.mensagem}</p>
                    </div>
                    {/* Ações */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-start gap-1">
                      {isMembro && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setReplyTo(canal.id, { id: m.id, preview: m.mensagem.slice(0, 60) })}
                          title="Responder"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {user?.id === m.user_id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deletar.mutate(m.id)}
                          title="Apagar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <MensagemComposer canalId={canal.id} threadId={threadId} disabled={!isMembro} />
      </div>

      {/* Membros sidebar (desktop) */}
      <aside className="hidden md:block bg-muted/30">
        <MembrosOnline clubeId={clubeId} />
      </aside>
    </div>
  );
};
