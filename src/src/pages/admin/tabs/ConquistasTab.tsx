import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Trophy } from "lucide-react";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";

const empty = { codigo: "", nome: "", descricao: "", icone_url: "", xp_recompensa: 50 };

export const ConquistasTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("conquistas").select("*").order("nome");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    r.nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const [pageSize, setPageSize] = useState<PageSize>(100);
  const { sorted, sort, toggle } = useSortable(filtered, (row, col) => {
    if (col === "codigo") return row.codigo ?? "";
    if (col === "nome") return row.nome ?? "";
    if (col === "xp_recompensa") return row.xp_recompensa ?? 0;
    return "";
  });
  const paged = sorted.slice(0, pageSize);

  const totalXP = filtered.reduce((acc, r) => acc + (r.xp_recompensa ?? 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen("create");
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({ codigo: r.codigo ?? "", nome: r.nome ?? "", descricao: r.descricao ?? "", icone_url: r.icone_url ?? "", xp_recompensa: r.xp_recompensa ?? 50 });
    setModalOpen("edit");
  };

  const create = async () => {
    if (!form.codigo || !form.nome) return toast.error("Código e nome obrigatórios");
    setSaving(true);
    const { error } = await (supabase as any).from("conquistas").insert({ ...form, xp_recompensa: Number(form.xp_recompensa), icone_url: form.icone_url || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conquista criada");
    setModalOpen(null); setForm(empty); load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await (supabase as any).from("conquistas").update({ codigo: form.codigo, nome: form.nome, descricao: form.descricao, icone_url: form.icone_url || null, xp_recompensa: Number(form.xp_recompensa) }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conquista atualizada");
    setModalOpen(null); setEditing(null); setForm(empty); load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("conquistas").delete().eq("id", deleteTarget);
    if (error) return toast.error(error.message);
    toast.success("Conquista excluída");
    setDeleteTarget(null); load();
  };

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Código <span className="text-destructive">*</span></Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
        <div><Label>XP recompensa</Label><Input type="number" value={form.xp_recompensa} onChange={(e) => setForm({ ...form, xp_recompensa: Number(e.target.value) })} /></div>
      </div>
      <div><Label>Nome <span className="text-destructive">*</span></Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
      <div><Label>Descrição</Label><Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div><Label>Ícone (URL)</Label><Input value={form.icone_url} onChange={(e) => setForm({ ...form, icone_url: e.target.value })} placeholder="https://…" /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou código..." />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />Nova conquista
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Conquistas <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <AdminEmptyState icon={Trophy} title="Nenhuma conquista encontrada" description={search ? `Nenhum resultado para "${search}".` : "Ainda não há conquistas cadastradas."} actionLabel="Nova conquista" onAction={openCreate} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <AdminSortableHead col="codigo" label="Código" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="nome" label="Nome" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="xp_recompensa" label="XP" sort={sort} onToggle={toggle} />
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.codigo}</TableCell>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.xp_recompensa}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(r.id)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center gap-4 pt-3 border-t mt-1 text-xs text-muted-foreground">
                <span>{paged.length < filtered.length ? `Exibindo ${paged.length} de ${filtered.length}` : `${filtered.length} conquista${filtered.length !== 1 ? "s" : ""}`}</span>
                <span>·</span>
                <span>{totalXP.toLocaleString("pt-BR")} XP acumulado</span>
                <AdminPageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminModal
        open={modalOpen === "create"}
        onOpenChange={(o) => !o && setModalOpen(null)}
        title="Cadastrar conquista"
        onConfirm={create}
        confirmLabel="Criar"
        isLoading={saving}
      >
        {formFields}
      </AdminModal>

      <AdminModal
        open={modalOpen === "edit"}
        onOpenChange={(o) => { if (!o) { setModalOpen(null); setEditing(null); } }}
        title="Editar conquista"
        onConfirm={saveEdit}
        confirmLabel="Salvar"
        isLoading={saving}
      >
        {formFields}
      </AdminModal>

      <AdminConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Excluir conquista?" description="Esta conquista será removida permanentemente." onConfirm={doDelete} />
    </div>
  );
};
