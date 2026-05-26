import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PreLeituraForm } from "./PreLeituraForm";

interface Props {
  pre: { intencao: string; dominio_previo: string | null; observacao: string | null };
  leituraId: string;
  usuarioLeituraId: string;
}

export const PreLeituraView = ({ pre, leituraId, usuarioLeituraId }: Props) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (editing) {
    return (
      <PreLeituraForm
        usuarioLeituraId={usuarioLeituraId}
        leituraId={leituraId}
        initial={pre}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  const excluir = async () => {
    setRemoving(true);
    try {
      await supabase.from("leitura_pre").delete().eq("leitura_id", leituraId);
      const { error } = await supabase.from("leituras").delete().eq("id", leituraId);
      if (error) throw error;
      toast.success("Pré-leitura excluída");
      setConfirmDel(false);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-xl bg-muted/30 flex flex-col gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Intenção</p>
          <p className="text-sm">{pre.intencao}</p>
        </div>
        {pre.dominio_previo && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Domínio prévio</p>
            <p className="text-sm">{pre.dominio_previo}</p>
          </div>
        )}
        {pre.observacao && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Observação</p>
            <p className="text-sm">{pre.observacao}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={() => setEditing(true)}>
          <Pencil className="w-3 h-3" /> Editar
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setConfirmDel(true)}>
          <Trash2 className="w-3 h-3" /> Excluir
        </Button>
      </div>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pré-leitura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove sua intenção, domínio prévio e observações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir} disabled={removing} className="bg-destructive hover:bg-destructive/90">
              {removing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
