import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ensureContainerLeitura } from "@/hooks/leituras/useContainerLeitura";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

const CATEGORIAS = ["Trabalho", "Família", "Saúde", "Finanças", "Estudos"];

interface Props {
  livro: LivroDetalhe;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const AplicacaoDialog = ({ livro, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [como, setComo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prazo, setPrazo] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (!como.trim()) return toast.error("Descreva como vai aplicar");
    setLoading(true);
    try {
      const containerId = await ensureContainerLeitura(livro, user!.id);
      const { error } = await supabase.from("leitura_aplicacoes").insert({
        leitura_id: containerId,
        descricao: como.trim(),
        plano_acao: { categoria: categoria || null, prazo: prazo || null },
      });
      if (error) throw error;
      toast.success("Aplicação registrada!");
      setComo(""); setCategoria(""); setPrazo("");
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
        <DialogHeader><DialogTitle>Nova aplicação</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Como vou aplicar *</label>
            <Textarea value={como} onChange={(e) => setComo(e.target.value)} rows={3} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Área da vida</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Prazo (opcional)</label>
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-11 rounded-xl mt-1" />
          </div>
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
