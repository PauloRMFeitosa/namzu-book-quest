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
import { Plus, Trash2 } from "lucide-react";

export const ConquistasTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo: "", nome: "", descricao: "", icone_url: "", xp_recompensa: 50 });

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
    setForm({ codigo: "", nome: "", descricao: "", icone_url: "", xp_recompensa: 50 });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir conquista?")) return;
    const { error } = await (supabase as any).from("conquistas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Nova conquista</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar conquista</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
                <div><Label>XP</Label><Input type="number" value={form.xp_recompensa} onChange={(e) => setForm({ ...form, xp_recompensa: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div><Label>Ícone (URL)</Label><Input value={form.icone_url} onChange={(e) => setForm({ ...form, icone_url: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Conquistas ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>XP</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell>{r.xp_recompensa}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
