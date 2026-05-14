import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2, BookOpen, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLeituraCopiloto } from "@/hooks/clubes/useClubeAI";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const LeituraCopilotoButton = ({
  usuarioLeituraId,
}: {
  usuarioLeituraId: string;
}) => {
  const [open, setOpen] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [historico, setHistorico] = useState<{ q: string; a: string }[]>([]);
  const m = useLeituraCopiloto();
  const { flags } = useFeatureFlags();
  const { isAdmin } = useIsAdmin();
  if (!isAdmin && !flags.show_clube_ai_copiloto) return null;

  const acao = async (
    modo: "perguntas_guia" | "explicar_conceito" | "resumo_capitulo" | "livre",
    p?: string,
  ) => {
    const r = await m.mutateAsync({ usuario_leitura_id: usuarioLeituraId, modo, pergunta: p });
    setHistorico((h) => [...h, { q: p ?? modo.replace("_", " "), a: r.texto }]);
    setPergunta("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 rounded-2xl border-2 gap-1.5">
          <Sparkles className="w-4 h-4 text-accent" /> Copiloto IA
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="font-display flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" /> Copiloto de leitura
          </SheetTitle>
          <SheetDescription>Pergunte, peça resumos ou perguntas-guia.</SheetDescription>
        </SheetHeader>

        <div className="px-5 py-3 flex flex-wrap gap-2 border-b">
          <Button size="sm" variant="secondary" className="text-xs h-8 rounded-full" onClick={() => acao("perguntas_guia")}>
            Perguntas-guia
          </Button>
          <Button size="sm" variant="secondary" className="text-xs h-8 rounded-full" onClick={() => acao("resumo_capitulo", pergunta || "trecho atual")}>
            Resumir trecho
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
          {historico.length === 0 && !m.isPending && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Comece com uma pergunta ou um atalho acima.
            </p>
          )}
          {historico.map((h, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {h.q}
              </p>
              <div className="prose prose-sm max-w-none p-3 rounded-xl bg-muted/40 border border-border/40">
                <ReactMarkdown>{h.a}</ReactMarkdown>
              </div>
            </div>
          ))}
          {m.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando…
            </div>
          )}
        </div>

        <form
          className="px-5 py-3 border-t flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pergunta.trim()) acao("livre", pergunta.trim());
          }}
        >
          <Input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Pergunte algo sobre o livro…"
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={m.isPending || !pergunta.trim()} className="rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
