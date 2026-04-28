import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export const AutoresTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  const load = async () => {
    const { data } = await supabase.from("autores").select("id, nome_completo, nome_ordenacao").order("nome_ordenacao").limit(500);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!nome.trim()) return toast.error("Nome obrigatório");
    const parts = nome.trim().split(" ");
    const ordenacao = parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}` : nome;
    const { error } = await (supabase as any).from("autores").insert({
      nome_completo: nome.trim(),
      nome_normalizado: norm(nome),
      nome_ordenacao: ordenacao,
    });
    if (error) return toast.error(error.message);
    toast.success("Autor criado");
    setNome(""); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir autor?")) return;
    const { error } = await (supabase as any).from("autores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Novo autor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar autor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome completo</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Autores ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordenação</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.nome_completo}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.nome_ordenacao}</TableCell>
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
