import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Target } from "lucide-react";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";

const empty = { codigo: "", titulo: "", descricao: "", tipo: "diaria", meta_acao: "", meta_valor: 1, xp_recompensa: 50, ativo_de: "", ativo_ate: "" };

export const MetasTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("missoes").select("*").order("ativo_ate", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const isActive = (r: any) => r.ativo_de <= today && r.ativo_ate >= today;

  const filtered = rows.filter((r) =>
    r.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const [pageSize, setPageSize] = useState<PageSize>(100);
  const { sorted, sort, toggle } = useSortable(filtered, (row, col) => {
    if (col === "titulo") return row.titulo ?? "";
    if (col === "codigo") return row.codigo ?? "";
    if (col === "xp_recompensa") return row.xp_recompensa ?? 0;
    if (col === "status") return isActive(row) ? 0 : 1;
    return "";
  });
  const paged = sorted.slice(0, pageSize);

  const ativas = filtered.filter(isActive).length;
  const encerradas = filtered.length - ativas;
  const totalXP = filtered.reduce((acc, r) => acc + (r.xp_recompensa ?? 0), 0);

  const buildPayload = () => {
    const t = new Date().toISOString().slice(0, 10);
    return { ...form, ativo_de: form.ativo_de || t, ativo_ate: form.ativo_ate || t, meta_valor: Number(form.meta_valor), xp_recompensa: Number(form.xp_recompensa) };
  };

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen("create");
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({ codigo: r.codigo ?? "", titulo: r.titulo ?? "", descricao: r.descricao ?? "", tipo: r.tipo ?? "diaria", meta_acao: r.meta_acao ?? "", meta_valor: r.meta_valor ?? 1, xp_recompensa: r.xp_recompensa ?? 50, ativo_de: r.ativo_de ?? "", ativo_ate: r.ativo_ate ?? "" });
    setModalOpen("edit");
  };

  const create = async () => {
    if (!form.codigo || !form.titulo) return toast.error("Código e título obrigatórios");
    setSaving(true);
    const { error } = await (supabase as any).from("missoes").insert(buildPayload());
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Meta criada");
    setModalOpen(null); setForm(empty); load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await (supabase as any).from("missoes").update(buildPayload()).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Meta atualizada");
    setModalOpen(null); setEditing(null); setForm(empty); load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("missoes").delete().eq("id", deleteTarget);
    if (error) return toast.error(error.message);
    toast.success("Meta excluída");
    setDeleteTarget(null); load();
  };

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Código <span className="text-destructive">*</span></Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
        <div><Label>Tipo</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="diaria/semanal" /></div>
      </div>
      <div><Label>Título <span className="text-destructive">*</span></Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      <div><Label>Descrição</Label><Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Ação</Label><Input value={form.meta_acao} onChange={(e) => setForm({ ...form, meta_acao: e.target.value })} placeholder="ler_paginas…" /></div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Buscar por título ou código..." />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />Nova meta
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Metas <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <AdminEmptyState icon={Target} title="Nenhuma meta encontrada" description={search ? `Nenhum resultado para "${search}".` : "Ainda não há metas cadastradas."} actionLabel="Nova meta" onAction={openCreate} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <AdminSortableHead col="codigo" label="Código" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="titulo" label="Título" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="xp_recompensa" label="XP" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="status" label="Status" sort={sort} onToggle={toggle} />
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.codigo}</TableCell>
                      <TableCell className="font-medium">{r.titulo}</TableCell>
                      <TableCell>{r.xp_recompensa}</TableCell>
                      <TableCell>
                        {isActive(r)
                          ? <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ativa</Badge>
                          : <Badge variant="outline" className="text-xs text-muted-foreground">Encerrada</Badge>}
                      </TableCell>
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
                <span>{paged.length < filtered.length ? `Exibindo ${paged.length} de ${filtered.length}` : `${filtered.length} meta${filtered.length !== 1 ? "s" : ""}`}</span>
                <span>·</span>
                <span className="text-green-600 dark:text-green-400">{ativas} ativa{ativas !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{encerradas} encerrada{encerradas !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{totalXP.toLocaleString("pt-BR")} XP total</span>
                <AdminPageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminModal
        open={modalOpen === "create"}
        onOpenChange={(o) => !o && setModalOpen(null)}
        title="Cadastrar meta"
        onConfirm={create}
        confirmLabel="Criar"
        isLoading={saving}
      >
        {formFields}
      </AdminModal>

      <AdminModal
        open={modalOpen === "edit"}
        onOpenChange={(o) => { if (!o) { setModalOpen(null); setEditing(null); } }}
        title="Editar meta"
        onConfirm={saveEdit}
        confirmLabel="Salvar"
        isLoading={saving}
      >
        {formFields}
      </AdminModal>

      <AdminConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Excluir meta?" description="Esta meta será removida permanentemente." onConfirm={doDelete} />
    </div>
  );
};
