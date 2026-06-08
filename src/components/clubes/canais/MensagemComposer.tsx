import { KeyboardEvent, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, X, CornerDownRight } from "lucide-react";
import { useCanalUIStore } from "@/stores/canalUIStore";
import { useEnviarMensagem } from "@/hooks/clubes/useMensagens";

interface Props {
  canalId: string;
  threadId: string | null | undefined;
  disabled?: boolean;
}

export const MensagemComposer = ({ canalId, threadId, disabled }: Props) => {
  const draft = useCanalUIStore((s) => s.drafts[canalId] ?? "");
  const setDraft = useCanalUIStore((s) => s.setDraft);
  const replyTo = useCanalUIStore((s) => s.replyTo[canalId] ?? null);
  const setReplyTo = useCanalUIStore((s) => s.setReplyTo);
  const enviar = useEnviarMensagem(threadId);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  const handleSend = async () => {
    const texto = draft.trim();
    if (!texto || !threadId) return;
    await enviar.mutateAsync({ texto, reply_to_id: replyTo?.id ?? null });
    setDraft(canalId, "");
    setReplyTo(canalId, null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border/60 bg-background/80 backdrop-blur p-3">
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-secondary/70">
          <CornerDownRight className="w-3.5 h-3.5 text-accent" />
          <span className="text-muted-foreground truncate flex-1">
            Respondendo: <span className="text-foreground">{replyTo.preview}</span>
          </span>
          <button onClick={() => setReplyTo(canalId, null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(canalId, e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "Entre no clube para participar" : "Escreva uma mensagem..."}
          rows={1}
          disabled={disabled}
          className="resize-none min-h-[40px] max-h-32 rounded-xl"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !draft.trim() || enviar.isPending}
          className="rounded-xl h-10 w-10 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
