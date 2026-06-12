import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

interface Props {
  livro: LivroDetalhe;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/**
 * Resenha standalone — grava em leitura_pos.resenha (única por livro).
 * Estrutura: opinião + positivos + negativos concatenados em campo resenha (markdown leve).
 */
export const ResenhaDialog = ({ livro, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [opiniao, setOpiniao] = useState("");
  const [positivos, setPositivos] = useState("");
  const [negativos, setNegativos] = useState("");
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && livro.leitura_pos?.resenha) {
      // Tenta extrair partes do conteúdo concatenado
      const r = livro.leitura_pos.resenha;
      setOpiniao(r);
      setPositivos("");
      setNegativos("");
    }
  }, [open, livro.leitura_pos]);

  const salvar = async () => {
    if (!opiniao.trim()) return toast.error("Escreva sua opinião");
    setLoading(true);
    try {
      let leituraId = livro.pos_leitura?.id;
      if (!leituraId) {
        leituraId = await iniciarLeitura({ usuario_leitura_id: livro.id, tipo: "pos_leitura", user_id: user!.id });
      }
      const partes = [opiniao.trim()];
      if (positivos.trim()) partes.push(`**Pontos positivos:** ${positivos.trim()}`);
      if (negativos.trim()) partes.push(`**Pontos negativos:** ${negativos.trim()}`);
      if (nota.trim()) partes.push(`**Nota:** ${nota.trim()}/10`);
      const resenha = partes.join("\n\n");

      const payload = { leitura_id: leituraId, resenha };
      const { error } = livro.leitura_pos
        ? await supabase.from("leitura_pos").update(payload).eq("leitura_id", leituraId)
        : await supabase.from("leitura_pos").insert(payload);
      if (error) throw error;
      toast.success("Resenha salva!");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Resenha</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Opinião *</label>
            <Textarea value={opiniao} onChange={(e) => setOpiniao(e.target.value)} rows={4} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pontos positivos</label>
            <Textarea value={positivos} onChange={(e) => setPositivos(e.target.value)} rows={2} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pontos negativos</label>
            <Textarea value={negativos} onChange={(e) => setNegativos(e.target.value)} rows={2} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nota (0-10)</label>
            <Input type="number" min={0} max={10} value={nota} onChange={(e) => setNota(e.target.value)} className="h-11 rounded-xl mt-1" />
          </div>
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
