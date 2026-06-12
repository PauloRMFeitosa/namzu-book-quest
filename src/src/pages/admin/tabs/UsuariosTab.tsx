import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Shield, ShieldOff, Pencil, Trash2, Users } from "lucide-react";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";

const getInitials = (name?: string, email?: string) => {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? "?").slice(0, 2).toUpperCase();
};

export const UsuariosTab = () => {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ email: "", password: "", full_name: "", make_admin: false });
  const [editForm, setEditForm] = useState({ email: "", password: "", full_name: "" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: listData, error: listErr }, { data: perfis }, { data: roles }] = await Promise.all([
      supabase.functions.invoke("admin-list-users"),
      supabase.from("gamificacao_perfis").select("user_id, xp_total, nivel, streak_atual"),
      (supabase as any).from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (listErr || (listData as any)?.error) {
      toast.error((listData as any)?.error ?? listErr?.message ?? "Erro ao listar usuários");
      setLoading(false);
      return;
    }
    const perfilMap = new Map((perfis ?? []).map((p: any) => [p.user_id, p]));
    const merged = ((listData as any).users ?? []).map((u: any) => ({
      ...u,
      ...(perfilMap.get(u.id) ?? { xp_total: 0, nivel: 1, streak_atual: 0 }),
      user_id: u.id,
    }));
    merged.sort((a: any, b: any) => (b.xp_total ?? 0) - (a.xp_total ?? 0));
    setRows(merged);
    setAdmins(new Set((roles ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((u) => {
    const q = search.toLowerCase();
    return (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const [pageSize, setPageSize] = useState<PageSize>(100);
  const { sorted, sort, toggle } = useSortable(filtered, (row, col) => {
    if (col === "nome") return row.full_name ?? row.email ?? "";
    if (col === "nivel") return row.nivel ?? 1;
    if (col === "xp_total") return row.xp_total ?? 0;
    return (row as any)[col] ?? "";
  });
  const paged = sorted.slice(0, pageSize);

  const totalXP = filtered.reduce((acc, u) => acc + (u.xp_total ?? 0), 0);
  const adminCount = filtered.filter((u) => admins.has(u.user_id)).length;

  const doToggleAdmin = async () => {
    if (!toggleTarget) return;
    const { userId, isAdmin } = toggleTarget;
    if (isAdmin) {
      const { error } = await (supabase as any).from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removido");
    } else {
      const { error } = await (supabase as any).from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin atribuído");
    }
    setToggleTarget(null); load();
  };

  const createUser = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
    setSaving(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error ?? error?.message ?? "Erro ao criar"); return; }
    toast.success("Usuário criado");
    setCreateOpen(false);
    setForm({ email: "", password: "", full_name: "", make_admin: false });
    load();
  };

  const startEdit = (userId: string) => {
    setEditing({ user_id: userId });
    setEditForm({ email: "", password: "", full_name: "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const payload: any = { action: "update", user_id: editing.user_id };
    if (editForm.email) payload.email = editForm.email;
    if (editForm.password) payload.password = editForm.password;
    if (editForm.full_name) payload.full_name = editForm.full_name;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: payload });
    setSaving(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erro");
    toast.success("Usuário atualizado");
    setEditOpen(false); setEditing(null); load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: { action: "delete", user_id: deleteTarget } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erro");
    toast.success("Usuário excluído");
    setDeleteTarget(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou email..." />
        <Button size="sm" className="shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Usuários {!loading && <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <AdminEmptyState icon={Users} title="Nenhum usuário encontrado" description={search ? `Nenhum resultado para "${search}".` : "Ainda não há usuários cadastrados."} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <AdminSortableHead col="nome" label="Usuário" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="nivel" label="Nível" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="xp_total" label="XP" sort={sort} onToggle={toggle} />
                    <TableHead>Papel</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((u) => {
                    const isAdmin = admins.has(u.user_id);
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getInitials(u.full_name, u.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{u.full_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{u.nivel ?? 1}</TableCell>
                        <TableCell>{(u.xp_total ?? 0).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Badge variant="secondary" className="gap-1 text-xs"><Shield className="h-3 w-3" /> Admin</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Membro</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setToggleTarget({ userId: u.user_id, isAdmin })} title={isAdmin ? "Remover admin" : "Tornar admin"}>
                              {isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(u.user_id)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" disabled={u.user_id === me?.id} onClick={() => setDeleteTarget(u.user_id)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center gap-4 pt-3 border-t mt-1 text-xs text-muted-foreground">
                <span>{paged.length < filtered.length ? `Exibindo ${paged.length} de ${filtered.length}` : `${filtered.length} usuário${filtered.length !== 1 ? "s" : ""}`}</span>
                <span>·</span>
                <span>{adminCount} admin{adminCount !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{totalXP.toLocaleString("pt-BR")} XP total</span>
                <AdminPageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create modal */}
      <AdminModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Cadastrar usuário"
        onConfirm={createUser}
        confirmLabel="Criar"
        isLoading={saving}
      >
        <div className="space-y-3">
          <div><Label>Email <span className="text-destructive">*</span></Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Senha <span className="text-destructive">*</span></Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="mk" checked={form.make_admin} onCheckedChange={(v) => setForm({ ...form, make_admin: !!v })} />
            <Label htmlFor="mk">Atribuir papel de admin</Label>
          </div>
        </div>
      </AdminModal>

      {/* Edit modal */}
      <AdminModal
        open={editOpen}
        onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditing(null); } }}
        title="Editar usuário"
        description="Preencha apenas os campos que deseja alterar."
        onConfirm={saveEdit}
        confirmLabel="Salvar"
        isLoading={saving}
      >
        <div className="space-y-3">
          <div><Label>Novo email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
          <div><Label>Nova senha</Label><Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></div>
          <div><Label>Nome completo</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
        </div>
      </AdminModal>

      <AdminConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Excluir usuário?" description="Esta ação é irreversível. O usuário e todos os seus dados serão removidos permanentemente." onConfirm={doDelete} />
      <AdminConfirmDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)} title={toggleTarget?.isAdmin ? "Remover permissão de admin?" : "Tornar este usuário admin?"} description={toggleTarget?.isAdmin ? "O usuário perderá acesso à área de administração." : "O usuário terá acesso completo à área de administração."} confirmLabel={toggleTarget?.isAdmin ? "Remover admin" : "Confirmar"} onConfirm={doToggleAdmin} />
    </div>
  );
};
