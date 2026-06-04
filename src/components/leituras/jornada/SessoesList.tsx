import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LeituraFull } from "@/hooks/leituras/useLivroDetalhe";

interface Props {
  sessoes: LeituraFull[];
  usuarioLeituraId: string;
}

export const SessoesList = ({ sessoes, usuarioLeituraId }: Props) => {
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<LeituraFull | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!sessoes.length) {
    return <p className="text-xs text-muted-foreground py-2">Nenhuma sessão registrada.</p>;
  }

  const ordenadas = [...sessoes].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const cumulative: Record<string, number> = {};
  // calcula página inicial de cada sessão (cronológico)
  let prev = 0;
  for (const s of [...sessoes].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))) {
    cumulative[s.id] = prev;
    if (s.paginas_lidas != null) prev = s.paginas_lidas;
  }

  const excluir = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await supabase.from("leitura_progresso").delete().eq("leitura_id", deleting.id);
      const { error } = await supabase.from("leituras").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Sessão excluída");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", usuarioLeituraId] });
      invalidateLeituras(qc);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Accordion type="multiple" className="flex flex-col gap-1.5">
        {ordenadas.map((s, idx) => {
          const pgInicial = cumulative[s.id] ?? 0;
          const pgFinal = s.paginas_lidas ?? pgInicial;
          const lidas = Math.max(0, pgFinal - pgInicial);
          return (
            <AccordionItem key={s.id} value={s.id} className="card-soft border-none px-3">
              <AccordionTrigger className="hover:no-underline py-2.5">
                <div className="flex flex-col items-start gap-0.5 text-left">
                  <span className="text-sm font-medium">
                    Sessão #{ordenadas.length - idx}
                    {lidas > 0 ? ` · ${lidas} pgs` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : ""}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Página inicial</p>
                    <p>{pgInicial}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Página final</p>
                    <p>{pgFinal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Páginas lidas</p>
                    <p>{lidas}</p>
                  </div>
                  {s.percentual_lido != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progresso</p>
                      <p>{Math.round(s.percentual_lido)}%</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2 mt-2 border-t border-border">
                  <Button size="sm" variant="ghost" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setDeleting(s)}>
                    <Trash2 className="w-3 h-3" /> Excluir
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove o registro de progresso desta sessão.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir} disabled={removing} className="bg-destructive hover:bg-destructive/90">
              {removing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
