import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = { nome: "", descricao: "", objetivo: "", regras: "", capa: "", duracao_tipo: "continuo", preco: 0, categoria: "" };

export const ClubesTab = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("clubes").select("id, nome, descricao, objetivo, regras, imagem_capa_url, is_ativo, duracao_tipo, preco_centavos, categoria").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    if (!user) return;
    const { error } = await (supabase as any).from("clubes").insert({
      nome: form.nome,
      descricao: form.descricao || null,
      objetivo: form.objetivo || null,
      regras: form.regras || null,
      imagem_capa_url: form.capa || null,
      duracao_tipo: form.duracao_tipo,
      preco_centavos: Number(form.preco) || 0,
      categoria: form.categoria || null,
      curador_id: user.id,
      is_ativo: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Clube criado");
    setOpen(false);
    setForm(empty);
    load();
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({
      nome: r.nome ?? "",
      descricao: r.descricao ?? "",
      objetivo: r.objetivo ?? "",
      regras: r.regras ?? "",
      capa: r.imagem_capa_url ?? "",
      duracao_tipo: r.duracao_tipo ?? "continuo",
      preco: r.preco_centavos ?? 0,
      categoria: r.categoria ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await (supabase as any).from("clubes").update({
      nome: form.nome,
      descricao: form.descricao || null,
      objetivo: form.objetivo || null,
      regras: form.regras || null,
      imagem_capa_url: form.capa || null,
      duracao_tipo: form.duracao_tipo,
      preco_centavos: Number(form.preco) || 0,
      categoria: form.categoria || null,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Clube atualizado");
    setEditing(null); setForm(empty); load();
  };

  const toggle = async (id: string, ativo: boolean) => {
    const { error } = await (supabase as any).from("clubes").update({ is_ativo: !ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir clube? Se houver membros ou conteúdos vinculados, prefira desativar.")) return;
    const { error } = await (supabase as any).from("clubes").delete().eq("id", id);
    if (error) {
      toast.error(error.message + " — tente desativar.");
      return;
    }
    toast.success("Clube excluído");
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Novo clube</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar clube</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
              <div><Label>Regras</Label><Textarea value={form.regras} onChange={(e) => setForm({ ...form, regras: e.target.value })} /></div>
              <div><Label>Capa (URL)</Label><Input value={form.capa} onChange={(e) => setForm({ ...form, capa: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Duração</Label><Input value={form.duracao_tipo} onChange={(e) => setForm({ ...form, duracao_tipo: e.target.value })} placeholder="continuo / temporada" /></div>
                <div><Label>Preço (centavos)</Label><Input type="number" value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria || "_none"} onValueChange={(v) => setForm({ ...form, categoria: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem categoria</SelectItem>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Clubes ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Ativo</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell>{r.duracao_tipo}</TableCell>
                  <TableCell>{r.is_ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggle(r.id, r.is_ativo)}>{r.is_ativo ? "Desativar" : "Ativar"}</Button>
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
          <DialogHeader><DialogTitle>Editar clube</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
            <div><Label>Regras</Label><Textarea value={form.regras} onChange={(e) => setForm({ ...form, regras: e.target.value })} /></div>
            <div><Label>Capa (URL)</Label><Input value={form.capa} onChange={(e) => setForm({ ...form, capa: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Duração</Label><Input value={form.duracao_tipo} onChange={(e) => setForm({ ...form, duracao_tipo: e.target.value })} /></div>
              <div><Label>Preço (centavos)</Label><Input type="number" value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria || "_none"} onValueChange={(v) => setForm({ ...form, categoria: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveEdit} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
