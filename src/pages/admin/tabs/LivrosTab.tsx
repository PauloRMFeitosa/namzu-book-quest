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
import { FilterBar, FilterColumn, FilterValue } from "@/components/admin/FilterBar";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Form = {
  titulo_original: string;
  titulo_ordenacao: string;
  slug: string;
  ano_primeira_publicacao: string;
  sinopse_padrao: string;
  capa_padrao_url: string;
  idioma_original: string;
};

const empty: Form = { titulo_original: "", titulo_ordenacao: "", slug: "", ano_primeira_publicacao: "", sinopse_padrao: "", capa_padrao_url: "", idioma_original: "pt-BR" };

const COLUMNS: FilterColumn[] = [
  { key: "titulo_original", label: "Título", type: "text" },
  { key: "ano_primeira_publicacao", label: "Ano", type: "number" },
  { key: "idioma_original", label: "Idioma", type: "text" },
  { key: "slug", label: "Slug", type: "text" },
];

export const LivrosTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("obras")
      .select("id, titulo_original, titulo_ordenacao, slug, ano_primeira_publicacao, capa_padrao_url, sinopse_padrao, idioma_original")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter) {
      const col = COLUMNS.find((c) => c.key === filter.key);
      if (col?.type === "number") q = q.eq(filter.key, Number(filter.value));
      else q = q.ilike(filter.key, `%${filter.value}%`);
    }
    const { data } = await q;
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const create = async () => {
    if (!form.titulo_original) return toast.error("Título obrigatório");
    const slug = form.slug || (slugify(form.titulo_original) + "-" + Date.now().toString(36).slice(-4));
    const payload = {
      titulo_original: form.titulo_original,
      titulo_ordenacao: form.titulo_ordenacao || form.titulo_original,
      slug,
      idioma_original: form.idioma_original || "pt-BR",
      sinopse_padrao: form.sinopse_padrao || null,
      capa_padrao_url: form.capa_padrao_url || null,
      ano_primeira_publicacao: form.ano_primeira_publicacao ? Number(form.ano_primeira_publicacao) : null,
    };
    const { error } = await (supabase as any).from("obras").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Livro criado");
    setOpen(false); setForm(empty); load();
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({
      titulo_original: r.titulo_original ?? "",
      titulo_ordenacao: r.titulo_ordenacao ?? "",
      slug: r.slug ?? "",
      ano_primeira_publicacao: r.ano_primeira_publicacao?.toString() ?? "",
      sinopse_padrao: r.sinopse_padrao ?? "",
      capa_padrao_url: r.capa_padrao_url ?? "",
      idioma_original: r.idioma_original ?? "pt-BR",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const payload = {
      titulo_original: form.titulo_original,
      titulo_ordenacao: form.titulo_ordenacao || form.titulo_original,
      slug: form.slug,
      idioma_original: form.idioma_original || "pt-BR",
      sinopse_padrao: form.sinopse_padrao || null,
      capa_padrao_url: form.capa_padrao_url || null,
      ano_primeira_publicacao: form.ano_primeira_publicacao ? Number(form.ano_primeira_publicacao) : null,
    };
    const { error } = await (supabase as any).from("obras").update(payload).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Livro atualizado");
    setEditing(null); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este livro?")) return;
    const { error } = await (supabase as any).from("obras").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  const Fields = (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto">
      <div><Label>Título original *</Label><Input value={form.titulo_original} onChange={(e) => setForm({ ...form, titulo_original: e.target.value })} /></div>
      <div><Label>Título ordenação</Label><Input value={form.titulo_ordenacao} onChange={(e) => setForm({ ...form, titulo_ordenacao: e.target.value })} placeholder="Padrão = título" /></div>
      <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Gerado automaticamente se vazio" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Ano</Label><Input type="number" value={form.ano_primeira_publicacao} onChange={(e) => setForm({ ...form, ano_primeira_publicacao: e.target.value })} /></div>
        <div><Label>Idioma</Label><Input value={form.idioma_original} onChange={(e) => setForm({ ...form, idioma_original: e.target.value })} /></div>
      </div>
      <div><Label>Capa (URL)</Label><Input value={form.capa_padrao_url} onChange={(e) => setForm({ ...form, capa_padrao_url: e.target.value })} /></div>
      <div><Label>Sinopse</Label><Textarea value={form.sinopse_padrao} onChange={(e) => setForm({ ...form, sinopse_padrao: e.target.value })} rows={5} /></div>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Novo livro</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar livro</DialogTitle></DialogHeader>
            {Fields}
            <Button onClick={create} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <FilterBar columns={COLUMNS} value={filter} onChange={setFilter} />

      <Card>
        <CardHeader><CardTitle className="text-base">Livros ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Ano</TableHead><TableHead>Idioma</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.titulo_original}</TableCell>
                    <TableCell>{r.ano_primeira_publicacao ?? "—"}</TableCell>
                    <TableCell>{r.idioma_original ?? "—"}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)} title="Excluir" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setForm(empty); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar livro</DialogTitle></DialogHeader>
          {Fields}
          <Button onClick={saveEdit} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
