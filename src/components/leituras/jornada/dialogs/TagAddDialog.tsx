import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TagsInput } from "@/components/leituras/TagsInput";
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

export const TagAddDialog = ({ livro, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (!tags.length) return toast.error("Informe pelo menos uma tag");
    setLoading(true);
    try {
      const containerId = await ensureContainerLeitura(livro, user!.id);
      const tagIds: string[] = [];
      for (const nome of tags) {
        const { data: existing } = await supabase
          .from("tags")
          .select("id")
          .ilike("nome", nome)
          .maybeSingle();
        if (existing) {
          tagIds.push(existing.id);
        } else {
          const { data: nova, error: te } = await supabase
            .from("tags")
            .insert({ nome })
            .select("id")
            .single();
          if (te) throw te;
          tagIds.push(nova.id);
        }
      }
      if (tagIds.length) {
        await supabase.from("leitura_tags").insert(
          tagIds.map((tag_id) => ({ leitura_id: containerId, tag_id }))
        );
      }
      toast.success("Tags adicionadas!");
      setTags([]);
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
        <DialogHeader><DialogTitle>Nova tag</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <TagsInput tags={tags} onChange={setTags} />
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl">{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
