import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { CapaUploader } from "@/components/clubes/shared/CapaUploader";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";

const empty = { nome: "", descricao: "", objetivo: "", regras: "", capa: "", duracao_tipo: "continuo", preco: 0, categoria: "", visibilidade: "publico" };

export const ClubesTab = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("clubes").select("id, nome, descricao, objetivo, regras, imagem_capa_url, is_ativo, duracao_tipo, preco_centavos, categoria, visibilidade").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => r.nome?.toLowerCase().includes(search.toLowerCase()));

  const [pageSize, setPageSize] = useState<PageSize>(100);
  const { sorted, sort, toggle } = useSortable(filtered, (row, col) => {
    if (col === "nome") return row.nome ?? "";
    if (col === "duracao_tipo") return row.duracao_tipo ?? "";
    if (col === "is_ativo") return row.is_ativo ? 1 : 0;
    return "";
  });
  const paged = sorted.slice(0, pageSize);

  const ativos = filtered.filter((r) => r.is_ativo).length;
  const inativos = filtered.length - ativos;

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen("create");
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({
      nome: r.nome ?? "", descricao: r.descricao ?? "", objetivo: r.objetivo ?? "",
      regras: r.regras ?? "", capa: r.imagem_capa_url ?? "", duracao_tipo: r.duracao_tipo ?? "continuo",
      preco: r.preco_centavos ?? 0, categoria: r.categoria ?? "", visibilidade: r.visibilidade ?? "publico",
    });
    setModalOpen("edit");
  };

  const create = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("clubes").insert({
      nome: form.nome, descricao: form.descricao || null, objetivo: form.objetivo || null,
      regras: form.regras || null, imagem_capa_url: form.capa || null,
      duracao_tipo: form.duracao_tipo, preco_centavos: Number(form.preco) || 0,
      categoria: form.categoria || null, visibilidade: form.visibilidade || "publico",
      curador_id: user.id, is_ativo: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Clube criado");
    setModalOpen(null); setForm(empty); load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await (supabase as any).from("clubes").update({
      nome: form.nome, descricao: form.descricao || null, objetivo: form.objetivo || null,
      regras: form.regras || null, imagem_capa_url: form.capa || null,
      duracao_tipo: form.duracao_tipo, preco_centavos: Number(form.preco) || 0,
      categoria: form.categoria || null, visibilidade: form.visibilidade || "publico",
    }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Clube atualizado");
    setModalOpen(null); setEditing(null); setForm(empty); load();
  };

  const toggle2 = async (id: string, ativo: boolean) => {
    const { error } = await (supabase as any).from("clubes").update({ is_ativo: !ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("clubes").delete().eq("id", deleteTarget);
    if (error) { toast.error(error.message + " — tente desativar."); setDeleteTarget(null); return; }
    toast.success("Clube excluído");
    setDeleteTarget(null); load();
  };

  const clubeFormFields = (
    <div className="space-y-3">
      <div><Label>Nome <span className="text-destructive">*</span></Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
      <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
      <div><Label>Regras</Label><Textarea rows={2} value={form.regras} onChange={(e) => setForm({ ...form, regras: e.target.value })} /></div>
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
            {CATEGORIAS.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Visibilidade</Label>
        <Select value={form.visibilidade} onValueChange={(v) => setForm({ ...form, visibilidade: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="publico">Público — qualquer pessoa pode entrar</SelectItem>
            <SelectItem value="privado">Privado — só por link, com pedido de entrada</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Buscar por nome..." />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />Novo clube
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Clubes <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <AdminEmptyState icon={Building2} title="Nenhum clube encontrado" description={search ? `Nenhum resultado para "${search}".` : "Ainda não há clubes cadastrados."} actionLabel="Novo clube" onAction={openCreate} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <AdminSortableHead col="nome" label="Nome" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="duracao_tipo" label="Tipo" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="is_ativo" label="Status" sort={sort} onToggle={toggle} />
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-xs capitalize">{r.duracao_tipo}</TableCell>
                      <TableCell>
                        {r.is_ativo
                          ? <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ativo</Badge>
                          : <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-xs px-2 h-7" onClick={() => toggle2(r.id, r.is_ativo)}>{r.is_ativo ? "Desativar" : "Ativar"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(r.id)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center gap-4 pt-3 border-t mt-1 text-xs text-muted-foreground">
                <span>{paged.length < filtered.length ? `Exibindo ${paged.length} de ${filtered.length}` : `${filtered.length} clube${filtered.length !== 1 ? "s" : ""}`}</span>
                <span>·</span>
                <span className="text-green-600 dark:text-green-400">{ativos} ativo{ativos !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{inativos} inativo{inativos !== 1 ? "s" : ""}</span>
                <AdminPageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminModal
        open={modalOpen === "create"}
        onOpenChange={(o) => !o && setModalOpen(null)}
        title="Cadastrar clube"
        onConfirm={create}
        confirmLabel="Criar"
        isLoading={saving}
        size="lg"
      >
        {clubeFormFields}
      </AdminModal>

      <AdminModal
        open={modalOpen === "edit"}
        onOpenChange={(o) => { if (!o) { setModalOpen(null); setEditing(null); } }}
        title="Editar clube"
        onConfirm={saveEdit}
        confirmLabel="Salvar"
        isLoading={saving}
        size="lg"
      >
        {clubeFormFields}
      </AdminModal>

      <AdminConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Excluir clube?" description="Se houver membros ou conteúdos vinculados, prefira desativar. A exclusão é irreversível." confirmLabel="Excluir clube" onConfirm={doDelete} />
    </div>
  );
};
