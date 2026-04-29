import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

const empty = { codigo: "", nome: "", descricao: "", icone_url: "", xp_recompensa: 50 };

export const ConquistasTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("conquistas").select("*").order("nome");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.codigo || !form.nome) return toast.error("Código e nome obrigatórios");
    const { error } = await (supabase as any).from("conquistas").insert({
      ...form,
      xp_recompensa: Number(form.xp_recompensa),
      icone_url: form.icone_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Conquista criada");
    setOpen(false);
    setForm(empty);
    load();
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({
      codigo: r.codigo ?? "",
      nome: r.nome ?? "",
      descricao: r.descricao ?? "",
      icone_url: r.icone_url ?? "",
      xp_recompensa: r.xp_recompensa ?? 50,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await (supabase as any).from("conquistas").update({
      codigo: form.codigo,
      nome: form.nome,
      descricao: form.descricao,
      icone_url: form.icone_url || null,
      xp_recompensa: Number(form.xp_recompensa),
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Conquista atualizada");
    setEditing(null); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir conquista?")) return;
    const { error } = await (supabase as any).from("conquistas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
        <div><Label>XP</Label><Input type="number" value={form.xp_recompensa} onChange={(e) => setForm({ ...form, xp_recompensa: Number(e.target.value) })} /></div>
      </div>
      <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
      <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div><Label>Ícone (URL)</Label><Input value={form.icone_url} onChange={(e) => setForm({ ...form, icone_url: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Nova conquista</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar conquista</DialogTitle></DialogHeader>
            {formFields}
            <Button onClick={create} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Conquistas ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>XP</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell>{r.xp_recompensa}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(r)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)} title="Excluir" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setForm(empty); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar conquista</DialogTitle></DialogHeader>
          {formFields}
          <Button onClick={saveEdit} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
