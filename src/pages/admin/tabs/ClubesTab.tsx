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
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";

export const ClubesTab = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", objetivo: "", regras: "", capa: "", duracao_tipo: "continuo", preco: 0 });

  const load = async () => {
    const { data } = await supabase.from("clubes").select("id, nome, is_ativo, duracao_tipo, preco_centavos").order("created_at", { ascending: false });
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
      curador_id: user.id,
      is_ativo: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Clube criado");
    setOpen(false);
    setForm({ nome: "", descricao: "", objetivo: "", regras: "", capa: "", duracao_tipo: "continuo", preco: 0 });
    load();
  };

  const toggle = async (id: string, ativo: boolean) => {
    const { error } = await (supabase as any).from("clubes").update({ is_ativo: !ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
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
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Clubes ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell>{r.duracao_tipo}</TableCell>
                  <TableCell>{r.is_ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => toggle(r.id, r.is_ativo)}>{r.is_ativo ? "Desativar" : "Ativar"}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
