import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";

interface Props {
  usuarioLeituraId: string;
  /** Quando passado, entra em modo edição da leitura_pre vinculada */
  leituraId?: string;
  initial?: { intencao: string; dominio_previo: string | null; observacao: string | null };
  onCancel?: () => void;
  onSaved?: () => void;
}

export const PreLeituraForm = ({ usuarioLeituraId, leituraId, initial, onCancel, onSaved }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!leituraId;
  const [intencao, setIntencao] = useState(initial?.intencao ?? "");
  const [dominio, setDominio] = useState(initial?.dominio_previo ?? "");
  const [obs, setObs] = useState(initial?.observacao ?? "");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intencao.trim()) return toast.error("Informe sua intenção");
    setLoading(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("leitura_pre")
          .update({
            intencao: intencao.trim(),
            dominio_previo: dominio.trim() || null,
            observacao: obs.trim() || null,
          })
          .eq("leitura_id", leituraId!);
        if (error) throw error;
        toast.success("Pré-leitura atualizada!");
      } else {
        const newLeituraId = await iniciarLeitura({
          usuario_leitura_id: usuarioLeituraId,
          tipo: "pre_leitura",
          user_id: user!.id,
        });
        const { error: e2 } = await supabase.from("leitura_pre").insert({
          leitura_id: newLeituraId,
          intencao: intencao.trim(),
          dominio_previo: dominio.trim() || null,
          observacao: obs.trim() || null,
        });
        if (e2) throw e2;
        toast.success("Pré-leitura salva!");
      }
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">{isEdit ? "Editar pré-leitura" : "Pré-leitura"}</h3>
        </div>
        {isEdit && onCancel && (
          <Button type="button" size="icon" variant="ghost" onClick={onCancel} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {!isEdit && <p className="text-xs text-muted-foreground">Defina sua intenção antes de começar.</p>}
      <div>
        <label className="text-xs text-muted-foreground">Intenção *</label>
        <Input value={intencao} onChange={(e) => setIntencao(e.target.value)} placeholder="O que busca neste livro?" className="h-11 rounded-xl mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Domínio prévio</label>
        <Textarea value={dominio} onChange={(e) => setDominio(e.target.value)} rows={2} placeholder="O que você já sabe?" className="rounded-xl mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Observação</label>
        <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="rounded-xl mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="h-11 rounded-2xl bg-primary hover:bg-primary-hover">
        {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar pré-leitura"}
      </Button>
    </form>
  );
};
