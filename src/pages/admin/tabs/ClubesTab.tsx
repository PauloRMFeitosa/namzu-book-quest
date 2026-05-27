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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CapaUploader } from "@/components/clubes/shared/CapaUploader";
import { FilterBar, FilterColumn, FilterValue } from "@/components/admin/FilterBar";

const empty = { nome: "", descricao: "", objetivo: "", regras: "", capa: "", duracao_tipo: "continuo", preco: 0, categoria: "", visibilidade: "publico", is_ativo: true };

const COLUMNS: FilterColumn[] = [
  { key: "nome", label: "Nome", type: "text" },
  { key: "categoria", label: "Categoria", type: "text" },
  { key: "visibilidade", label: "Visibilidade", type: "text" },
  { key: "duracao_tipo", label: "Duração", type: "text" },
  { key: "is_ativo", label: "Ativo", type: "boolean" },
];

export const ClubesTab = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<FilterValue>(null);

  const load = async () => {
    let q = (supabase as any).from("clubes")
      .select("id, nome, descricao, objetivo, regras, imagem_capa_url, is_ativo, duracao_tipo, preco_centavos, categoria, visibilidade, curador_id, created_at")
      .order("created_at", { ascending: false });
    if (filter) {
      const col = COLUMNS.find((c) => c.key === filter.key);
      if (col?.type === "boolean") q = q.eq(filter.key, filter.value === "true");
      else q = q.ilike(filter.key, `%${filter.value}%`);
    }
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const buildPayload = (includeCurador: boolean) => ({
    nome: form.nome,
    descricao: form.descricao || null,
    objetivo: form.objetivo || null,
    regras: form.regras || null,
    imagem_capa_url: form.capa || null,
    duracao_tipo: form.duracao_tipo,
    preco_centavos: Number(form.preco) || 0,
    categoria: form.categoria || null,
    visibilidade: form.visibilidade || "publico",
    is_ativo: form.is_ativo,
    ...(includeCurador && user ? { curador_id: user.id } : {}),
  });

  const create = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    if (!user) return;
    const { error } = await (supabase as any).from("clubes").insert(buildPayload(true));
    if (error) return toast.error(error.message);
    toast.success("Clube criado");
    setOpen(false); setForm(empty); load();
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
      visibilidade: r.visibilidade ?? "publico",
      is_ativo: r.is_ativo ?? true,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await (supabase as any).from("clubes").update(buildPayload(false)).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Clube atualizado");
    setEditing(null); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir clube? Se houver membros vinculados, prefira desativar.")) return;
    const { error } = await (supabase as any).from("clubes").delete().eq("id", id);
    if (error) return toast.error(error.message + " — tente desativar.");
    toast.success("Clube excluído");
    load();
  };

  const Fields = (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto">
      <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
      <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
      <div><Label>Regras</Label><Textarea value={form.regras} onChange={(e) => setForm({ ...form, regras: e.target.value })} /></div>
      <div><Label>Capa</Label><CapaUploader value={form.capa} onChange={(v) => setForm({ ...form, capa: v })} /></div>
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
            {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Visibilidade</Label>
        <Select value={form.visibilidade} onValueChange={(v) => setForm({ ...form, visibilidade: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="publico">Público</SelectItem>
            <SelectItem value="privado">Privado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between border rounded-md px-3 py-2">
        <Label htmlFor="ativo">Clube ativo</Label>
        <Switch id="ativo" checked={form.is_ativo} onCheckedChange={(v) => setForm({ ...form, is_ativo: v })} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Novo clube</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar clube</DialogTitle></DialogHeader>
            {Fields}
            <Button onClick={create} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <FilterBar columns={COLUMNS} value={filter} onChange={setFilter} />

      <Card>
        <CardHeader><CardTitle className="text-base">Clubes ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Tipo</TableHead><TableHead>Ativo</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell className="text-xs">{r.categoria ?? "—"}</TableCell>
                  <TableCell>{r.duracao_tipo}</TableCell>
                  <TableCell>{r.is_ativo ? "Sim" : "Não"}</TableCell>
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
          <DialogHeader><DialogTitle>Editar clube</DialogTitle></DialogHeader>
          {Fields}
          <Button onClick={saveEdit} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
