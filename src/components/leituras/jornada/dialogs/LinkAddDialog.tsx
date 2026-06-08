import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const LinkAddDialog = ({ livro, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tipo, setTipo] = useState("url");
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (!url.trim()) return toast.error("Informe a URL");
    setLoading(true);
    try {
      const containerId = await ensureContainerLeitura(livro, user!.id);
      const { error } = await supabase.from("leitura_links").insert({
        leitura_id: containerId,
        tipo: tipo || null,
        url: url.trim(),
        descricao: descricao.trim() || null,
      });
      if (error) throw error;
      toast.success("Link adicionado!");
      setTipo("url");
      setUrl("");
      setDescricao("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo link</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-10 w-full rounded-xl bg-background border border-input px-2 text-sm mt-1"
            >
              <option value="url">URL</option>
              <option value="video">Vídeo</option>
              <option value="audio">Áudio</option>
              <option value="documento">Documento</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">URL *</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="h-11 rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Artigo sobre..." className="h-11 rounded-xl mt-1" />
          </div>
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
