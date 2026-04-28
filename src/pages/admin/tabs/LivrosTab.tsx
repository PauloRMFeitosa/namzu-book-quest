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

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const LivrosTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo_original: "", ano: "", sinopse: "", capa_url: "", idioma: "pt-BR" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("obras").select("id, titulo_original, ano_primeira_publicacao, capa_padrao_url").order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.titulo_original) return toast.error("Título obrigatório");
    const slug = slugify(form.titulo_original) + "-" + Date.now().toString(36).slice(-4);
    const payload = {
      titulo_original: form.titulo_original,
      titulo_ordenacao: form.titulo_original,
      slug,
      idioma_original: form.idioma,
      sinopse_padrao: form.sinopse || null,
      capa_padrao_url: form.capa_url || null,
      ano_primeira_publicacao: form.ano ? Number(form.ano) : null,
    };
    const { error } = await (supabase as any).from("obras").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Livro criado");
    setOpen(false);
    setForm({ titulo_original: "", ano: "", sinopse: "", capa_url: "", idioma: "pt-BR" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este livro?")) return;
    const { error } = await (supabase as any).from("obras").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Novo livro</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar livro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.titulo_original} onChange={(e) => setForm({ ...form, titulo_original: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Ano</Label><Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} /></div>
                <div><Label>Idioma</Label><Input value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })} /></div>
              </div>
              <div><Label>Capa (URL)</Label><Input value={form.capa_url} onChange={(e) => setForm({ ...form, capa_url: e.target.value })} /></div>
              <div><Label>Sinopse</Label><Textarea value={form.sinopse} onChange={(e) => setForm({ ...form, sinopse: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Livros ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Ano</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.titulo_original}</TableCell>
                    <TableCell>{r.ano_primeira_publicacao ?? "—"}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
