import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

export const PreLeituraForm = ({ usuarioLivroId }: { usuarioLivroId: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [intencao, setIntencao] = useState("");
  const [dominio, setDominio] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intencao.trim()) return toast.error("Informe sua intenção");
    setLoading(true);
    try {
      const { data: leitura, error } = await supabase
        .from("leituras")
        .insert({ user_id: user!.id, usuario_livro_id: usuarioLivroId, tipo: "pre_leitura" })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("leitura_pre").insert({
        leitura_id: leitura.id,
        intencao: intencao.trim(),
        dominio_previo: dominio.trim() || null,
        observacao: obs.trim() || null,
      });
      if (e2) throw e2;
      toast.success("Pré-leitura salva!");
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLivroId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Pré-leitura</h3>
      </div>
      <p className="text-xs text-muted-foreground">Defina sua intenção antes de começar.</p>
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
        {loading ? "Salvando..." : "Salvar pré-leitura"}
      </Button>
    </form>
  );
};
