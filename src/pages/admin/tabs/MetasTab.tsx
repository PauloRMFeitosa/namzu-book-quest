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

export const MetasTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo: "", titulo: "", descricao: "", tipo: "diaria", meta_acao: "", meta_valor: 1, xp_recompensa: 50, ativo_de: "", ativo_ate: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("missoes").select("*").order("ativo_ate", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.codigo || !form.titulo) return toast.error("Código e título obrigatórios");
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      ...form,
      ativo_de: form.ativo_de || today,
      ativo_ate: form.ativo_ate || today,
      meta_valor: Number(form.meta_valor),
      xp_recompensa: Number(form.xp_recompensa),
    };
    const { error } = await (supabase as any).from("missoes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Meta criada");
    setOpen(false);
    setForm({ codigo: "", titulo: "", descricao: "", tipo: "diaria", meta_acao: "", meta_valor: 1, xp_recompensa: 50, ativo_de: "", ativo_ate: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir meta?")) return;
    const { error } = await (supabase as any).from("missoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Nova meta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar meta</DialogTitle></DialogHeader>
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
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Metas ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>XP</TableHead><TableHead>Até</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell>{r.titulo}</TableCell>
                  <TableCell>{r.xp_recompensa}</TableCell>
                  <TableCell>{r.ativo_ate}</TableCell>
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
