import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { iniciarLeitura } from "@/hooks/leituras/useLeituraActions";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

export const PosLeituraSimples = ({ livro }: { livro: LivroDetalhe }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const concluido = livro.status === "concluido";
  const pos = livro.leitura_pos;
  const posSessao = livro.pos_leitura;

  const [editing, setEditing] = useState(false);
  const [resumo, setResumo] = useState(pos?.resumo_geral ?? "");
  const [ideia, setIdeia] = useState(pos?.ideia_principal ?? "");
  const [resenha] = useState(pos?.resenha ?? "");
  const [publica, setPublica] = useState<boolean>(pos?.publica ?? false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pos) {
      setResumo(pos.resumo_geral ?? "");
      setIdeia(pos.ideia_principal ?? "");
      setPublica(pos.publica ?? false);
    }
  }, [pos]);

  if (!concluido) {
    return (
      <div className="p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
        Disponível após concluir o livro.
      </div>
    );
  }

  const salvar = async () => {
    setLoading(true);
    try {
      let leituraId = posSessao?.id;
      if (!leituraId) {
        leituraId = await iniciarLeitura({ usuario_leitura_id: livro.id, tipo: "pos_leitura", user_id: user!.id });
      }
      const payload = {
        leitura_id: leituraId,
        resumo_geral: resumo || null,
        ideia_principal: ideia || null,
        resenha: resenha || null,
        publica,
      };
      const { error } = pos
        ? await supabase.from("leitura_pos").update(payload).eq("leitura_id", leituraId)
        : await supabase.from("leitura_pos").insert(payload);
      if (error) throw error;
      toast.success("Pós-leitura salva!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", livro.id] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", livro.id] });
      invalidateLeituras(qc);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!pos || editing) {
    return (
      <div className="p-3 rounded-xl bg-muted/30 flex flex-col gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Resumo final</label>
          <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} className="rounded-xl mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Principais aprendizados</label>
          <Textarea value={ideia} onChange={(e) => setIdeia(e.target.value)} rows={3} className="rounded-xl mt-1" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={publica} onCheckedChange={(v) => setPublica(!!v)} /> Tornar público
        </label>
        <div className="flex gap-2">
          {pos && (
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setEditing(false)}>Cancelar</Button>
          )}
          <Button onClick={salvar} disabled={loading} className="h-11 rounded-2xl flex-1">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-muted/30 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Concluído</span>
      </div>
      {pos.resumo_geral && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resumo final</p>
          <p className="text-sm whitespace-pre-wrap">{pos.resumo_geral}</p>
        </div>
      )}
      {pos.ideia_principal && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Principais aprendizados</p>
          <p className="text-sm whitespace-pre-wrap">{pos.ideia_principal}</p>
        </div>
      )}
      <Button size="sm" variant="outline" className="rounded-xl self-start mt-1" onClick={() => setEditing(true)}>
        <Pencil className="w-3 h-3" /> Editar
      </Button>
    </div>
  );
};
