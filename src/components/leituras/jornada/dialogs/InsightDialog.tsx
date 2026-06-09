import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ensureContainerLeitura } from "@/hooks/leituras/useContainerLeitura";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

interface Props {
  livro: LivroDetalhe;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const InsightDialog = ({ livro, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [aprendi, setAprendi] = useState("");
  const [porque, setPorque] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (!aprendi.trim()) return toast.error("Descreva o aprendizado");
    setLoading(true);
    try {
      const containerId = await ensureContainerLeitura(livro, user!.id);
      const { error } = await supabase.from("leitura_conteudo").insert({
        leitura_id: containerId,
        resumo: aprendi.trim(),
        conceito_principal: porque.trim() || null,
      });
      if (error) throw error;
      toast.success("Insight registrado!");
      setAprendi(""); setPorque("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo insight</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">O que aprendi *</label>
            <Textarea value={aprendi} onChange={(e) => setAprendi(e.target.value)} rows={3} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Por que foi importante</label>
            <Textarea value={porque} onChange={(e) => setPorque(e.target.value)} rows={2} className="rounded-xl mt-1" />
          </div>
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
