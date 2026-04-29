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

const empty = { codigo: "", titulo: "", descricao: "", tipo: "diaria", meta_acao: "", meta_valor: 1, xp_recompensa: 50, ativo_de: "", ativo_ate: "" };

export const MetasTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("missoes").select("*").order("ativo_ate", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const buildPayload = () => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...form,
      ativo_de: form.ativo_de || today,
      ativo_ate: form.ativo_ate || today,
      meta_valor: Number(form.meta_valor),
      xp_recompensa: Number(form.xp_recompensa),
    };
  };

  const create = async () => {
    if (!form.codigo || !form.titulo) return toast.error("Código e título obrigatórios");
    const { error } = await (supabase as any).from("missoes").insert(buildPayload());
    if (error) return toast.error(error.message);
    toast.success("Meta criada");
    setOpen(false);
    setForm(empty);
    load();
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({
      codigo: r.codigo ?? "",
      titulo: r.titulo ?? "",
      descricao: r.descricao ?? "",
      tipo: r.tipo ?? "diaria",
      meta_acao: r.meta_acao ?? "",
      meta_valor: r.meta_valor ?? 1,
      xp_recompensa: r.xp_recompensa ?? 50,
      ativo_de: r.ativo_de ?? "",
      ativo_ate: r.ativo_ate ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await (supabase as any).from("missoes").update(buildPayload()).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Meta atualizada");
    setEditing(null); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir meta?")) return;
    const { error } = await (supabase as any).from("missoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const formFields = (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
        <div><Label>Tipo</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="diaria/semanal" /></div>
      </div>
      <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Ação</Label><Input value={form.meta_acao} onChange={(e) => setForm({ ...form, meta_acao: e.target.value })} placeholder="ler_paginas..." /></div>
        <div><Label>Valor</Label><Input type="number" value={form.meta_valor} onChange={(e) => setForm({ ...form, meta_valor: Number(e.target.value) })} /></div>
      </div>
      <div><Label>XP recompensa</Label><Input type="number" value={form.xp_recompensa} onChange={(e) => setForm({ ...form, xp_recompensa: Number(e.target.value) })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Ativo de</Label><Input type="date" value={form.ativo_de} onChange={(e) => setForm({ ...form, ativo_de: e.target.value })} /></div>
        <div><Label>Ativo até</Label><Input type="date" value={form.ativo_ate} onChange={(e) => setForm({ ...form, ativo_ate: e.target.value })} /></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Nova meta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar meta</DialogTitle></DialogHeader>
            {formFields}
            <Button onClick={create} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Metas ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>XP</TableHead><TableHead>Até</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell>{r.titulo}</TableCell>
                  <TableCell>{r.xp_recompensa}</TableCell>
                  <TableCell>{r.ativo_ate}</TableCell>
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
          <DialogHeader><DialogTitle>Editar meta</DialogTitle></DialogHeader>
          {formFields}
          <Button onClick={saveEdit} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
