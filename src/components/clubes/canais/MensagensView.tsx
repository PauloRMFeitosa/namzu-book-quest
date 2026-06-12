import { useEffect, useMemo, useRef } from "react";
import { Hash, Loader2, Trash2, Reply, CornerDownRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useThreadPadrao } from "@/hooks/clubes/useCanais";
import { useMensagens, useDeletarMensagem, type Mensagem } from "@/hooks/clubes/useMensagens";
import { MensagemComposer } from "./MensagemComposer";
import { useCanalUIStore } from "@/stores/canalUIStore";
import type { Canal } from "@/hooks/clubes/useCanais";

interface Props {
  clubeId: string;
  canal: Canal;
  isMembro: boolean;
}

const formatHora = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const formatDia = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export const MensagensView = ({ clubeId: _clubeId, canal, isMembro }: Props) => {
  const { user } = useAuth();
  const { data: threadId, isLoading: loadingThread } = useThreadPadrao(canal.id);
  const { data: mensagens, isLoading } = useMensagens(threadId);
  const deletar = useDeletarMensagem(threadId);
  const setReplyTo = useCanalUIStore((s) => s.setReplyTo);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens?.length]);

  const mapById = useMemo(() => {
    const m = new Map<string, Mensagem>();
    (mensagens ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [mensagens]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="border-b border-border/60 px-4 py-3 flex items-center gap-2 shrink-0">
        <Hash className="w-4 h-4 text-accent" />
        <div className="flex flex-col min-w-0">
          <span className="font-display font-semibold leading-tight truncate">{canal.nome}</span>
          {canal.descricao && (
            <span className="text-xs text-muted-foreground truncate">{canal.descricao}</span>
          )}
        </div>
      </div>

      {/* Mensagens — estilo WhatsApp */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
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
            const isOwn = m.user_id === user?.id;
            const prev = mensagens[idx - 1];
            const sameAuthor =
              prev &&
              prev.user_id === m.user_id &&
              new Date(m.created_at!).getTime() - new Date(prev.created_at!).getTime() < 5 * 60_000;
            const dia = formatDia(m.created_at);
            const prevDia = prev ? formatDia(prev.created_at) : null;
            const showDay = dia !== prevDia;
            const replied = m.reply_to_id ? mapById.get(m.reply_to_id) : null;

            return (
              <div key={m.id}>
                {/* Separador de dia */}
                {showDay && (
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background px-2">
                      {dia}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}

                {/* Linha de mensagem */}
                <div className={`group flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} ${sameAuthor ? "mt-0.5" : "mt-3"}`}>
                  {/* Avatar (só exibe para mensagens de outros, na primeira da sequência) */}
                  {!isOwn ? (
                    sameAuthor ? (
                      <div className="w-8 shrink-0" />
                    ) : (
                      <Avatar className="w-8 h-8 shrink-0 self-end">
                        <AvatarImage src={m.autor?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(m.autor?.nome_exibicao ?? m.autor?.username ?? "?")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )
                  ) : null}

                  {/* Bolha */}
                  <div className={`relative max-w-[72%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {/* Nome (apenas primeira mensagem do grupo, mensagens de outros) */}
                    {!isOwn && !sameAuthor && (
                      <span className="text-[10px] font-semibold text-primary mb-0.5 px-1">
                        {m.autor?.nome_exibicao ?? m.autor?.username ?? "Anônimo"}
                      </span>
                    )}

                    {/* Reply preview */}
                    {replied && (
                      <div className={`flex items-center gap-1 text-[11px] mb-1 px-2 py-1 rounded-lg border-l-2 border-primary/60 bg-muted/60 max-w-full ${isOwn ? "self-end" : "self-start"}`}>
                        <CornerDownRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-foreground/70 shrink-0">
                          {replied.autor?.nome_exibicao ?? "Anônimo"}:
                        </span>
                        <span className="truncate text-muted-foreground">{replied.mensagem}</span>
                      </div>
                    )}

                    {/* Bolha principal */}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words leading-relaxed relative ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary/70 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.mensagem}
                      <span className={`text-[10px] ml-2 inline-block align-bottom opacity-70 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatHora(m.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Ações (hover) */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 self-end pb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                    {isMembro && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setReplyTo(canal.id, { id: m.id, preview: m.mensagem.slice(0, 60) })}
                        title="Responder"
                      >
                        <Reply className="w-3 h-3" />
                      </Button>
                    )}
                    {user?.id === m.user_id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => deletar.mutate(m.id)}
                        title="Apagar"
                      >
                        <Trash2 className="w-3 h-3" />
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
  );
};
