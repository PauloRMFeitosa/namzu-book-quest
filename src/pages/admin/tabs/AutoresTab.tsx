import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, User } from "lucide-react";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const buildOrdenacao = (nome: string) => {
  const parts = nome.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}` : nome.trim();
};

const empty = {
  nome_completo: "",
  nacionalidade: "",
  data_nascimento: "",
  data_falecimento: "",
  foto_url: "",
  descricao: "",
};

export const AutoresTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("autores")
      .select("id, nome_completo, nome_ordenacao, nacionalidade, data_nascimento, data_falecimento, foto_url, descricao")
      .order("nome_ordenacao")
      .limit(500);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    r.nome_completo?.toLowerCase().includes(search.toLowerCase())
  );

  const [pageSize, setPageSize] = useState<PageSize>(100);
  const { sorted, sort, toggle } = useSortable(filtered, (row, col) => {
    if (col === "nome_completo") return row.nome_completo ?? "";
    if (col === "nome_ordenacao") return row.nome_ordenacao ?? "";
    if (col === "nacionalidade") return row.nacionalidade ?? "";
    return "";
  });
  const paged = sorted.slice(0, pageSize);

  // ── Modal openers ─────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen("create");
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({
      nome_completo: r.nome_completo ?? "",
      nacionalidade: r.nacionalidade ?? "",
      data_nascimento: r.data_nascimento ?? "",
      data_falecimento: r.data_falecimento ?? "",
      foto_url: r.foto_url ?? "",
      descricao: r.descricao ?? "",
    });
    setModalOpen("edit");
  };

  // ── CRUD ──────────────────────────────────────────────────
  const buildPayload = () => ({
    nome_completo: form.nome_completo.trim(),
    nome_normalizado: norm(form.nome_completo),
    nome_ordenacao: buildOrdenacao(form.nome_completo),
    nome_cadastro: form.nome_completo.trim(),
    nacionalidade: form.nacionalidade || null,
    data_nascimento: form.data_nascimento || null,
    data_falecimento: form.data_falecimento || null,
    foto_url: form.foto_url || null,
    descricao: form.descricao || null,
  });

  const create = async () => {
    if (!form.nome_completo.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    const { error } = await (supabase as any).from("autores").insert(buildPayload());
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Autor criado");
    setModalOpen(null);
    load();
  };

  const saveEdit = async () => {
    if (!editing || !form.nome_completo.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from("autores").update(buildPayload()).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Autor atualizado");
    setModalOpen(null);
    setEditing(null);
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("autores").delete().eq("id", deleteTarget);
    if (error) return toast.error(error.message);
    toast.success("Autor excluído");
    setDeleteTarget(null); load();
  };

  // ── Form JSX ──────────────────────────────────────────────
  const formFields = (
    <div className="space-y-3">
      <div>
        <Label>Nome completo <span className="text-destructive">*</span></Label>
        <Input
          value={form.nome_completo}
          onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
          placeholder="Ex: Machado de Assis"
        />
      </div>
      <div>
        <Label>Nacionalidade</Label>
        <Input
          value={form.nacionalidade}
          onChange={(e) => setForm({ ...form, nacionalidade: e.target.value })}
          placeholder="Ex: Brasileira"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data de nascimento</Label>
          <Input
            type="date"
            value={form.data_nascimento}
            onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
          />
        </div>
        <div>
          <Label>Data de falecimento</Label>
          <Input
            type="date"
            value={form.data_falecimento}
            onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Foto (URL)</Label>
        <Input
          value={form.foto_url}
          onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
          placeholder="https://…"
        />
      </div>
      <div>
        <Label>Biografia</Label>
        <Textarea
          rows={4}
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Breve descrição do autor…"
        />
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Buscar por nome..." />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />Novo autor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Autores <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <AdminEmptyState icon={User} title="Nenhum autor encontrado" description={search ? `Nenhum resultado para "${search}".` : "Ainda não há autores cadastrados."} actionLabel="Novo autor" onAction={openCreate} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <AdminSortableHead col="nome_completo" label="Nome" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="nacionalidade" label="Nacionalidade" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="nome_ordenacao" label="Ordenação" sort={sort} onToggle={toggle} />
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {r.foto_url ? (
                            <img src={r.foto_url} alt={r.nome_completo} className="h-6 w-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{r.nome_completo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.nacionalidade ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.nome_ordenacao}</TableCell>
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
                <span>{paged.length < filtered.length ? `Exibindo ${paged.length} de ${filtered.length}` : `${filtered.length} autor${filtered.length !== 1 ? "es" : ""}`}</span>
                <AdminPageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create modal */}
      <AdminModal
        open={modalOpen === "create"}
        onOpenChange={(o) => !o && setModalOpen(null)}
        title="Cadastrar autor"
        onConfirm={create}
        confirmLabel="Criar"
        isLoading={saving}
      >
        {formFields}
      </AdminModal>

      {/* Edit modal */}
      <AdminModal
        open={modalOpen === "edit"}
        onOpenChange={(o) => { if (!o) { setModalOpen(null); setEditing(null); } }}
        title="Editar autor"
        onConfirm={saveEdit}
        confirmLabel="Salvar"
        isLoading={saving}
      >
        {formFields}
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir autor?"
        description="Este autor será removido permanentemente."
        onConfirm={doDelete}
      />
    </div>
  );
};
