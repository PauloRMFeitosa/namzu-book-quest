import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FilterBar, FilterColumn, FilterValue } from "@/components/admin/FilterBar";

const COLUMNS: FilterColumn[] = [
  { key: "email", label: "Email", type: "text" },
  { key: "full_name", label: "Nome", type: "text" },
  { key: "nivel", label: "Nível", type: "number" },
  { key: "xp_total", label: "XP", type: "number" },
  { key: "is_admin", label: "Admin", type: "boolean" },
];

const emptyEdit = {
  email: "", password: "", full_name: "",
  perfil: {
    username: "", nome_exibicao: "", bio: "", avatar_url: "", banner_url: "",
    cidade: "", pais: "", tipo_perfil: "leitor", verificado: false,
    instagram_url: "", youtube_url: "", tiktok_url: "", site_url: "",
  },
  gam: { xp_total: "", nivel: "", streak_atual: "", streak_maximo: "" },
  is_admin: false,
};

export const UsuariosTab = () => {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [perfisMap, setPerfisMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", make_admin: false });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterValue>(null);

  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<typeof emptyEdit>(emptyEdit);

  const load = async () => {
    setLoading(true);
    const [{ data: listData, error: listErr }, { data: perfisGam }, { data: roles }, { data: perfisRows }] = await Promise.all([
      supabase.functions.invoke("admin-list-users"),
      supabase.from("gamificacao_perfis").select("user_id, xp_total, nivel, streak_atual, streak_maximo"),
      (supabase as any).from("user_roles").select("user_id, role").eq("role", "admin"),
      (supabase as any).from("perfis").select("*"),
    ]);
    if (listErr || (listData as any)?.error) {
      toast.error((listData as any)?.error ?? listErr?.message ?? "Erro ao listar usuários");
      setLoading(false);
      return;
    }
    const gamMap = new Map((perfisGam ?? []).map((p: any) => [p.user_id, p]));
    const pMap = new Map<string, any>((perfisRows ?? []).map((p: any) => [p.user_id as string, p]));
    const merged = ((listData as any).users ?? []).map((u: any) => ({
      ...u,
      ...(gamMap.get(u.id) ?? { xp_total: 0, nivel: 1, streak_atual: 0, streak_maximo: 0 }),
      user_id: u.id,
    }));
    merged.sort((a: any, b: any) => (b.xp_total ?? 0) - (a.xp_total ?? 0));
    setRows(merged);
    setAdmins(new Set((roles ?? []).map((r: any) => r.user_id)));
    setPerfisMap(pMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!filter) return rows;
    const col = COLUMNS.find((c) => c.key === filter.key);
    const v = filter.value;
    return rows.filter((r) => {
      if (filter.key === "is_admin") return admins.has(r.user_id) === (v === "true");
      const cell = r[filter.key];
      if (cell == null) return false;
      if (col?.type === "number") return Number(cell) === Number(v);
      return String(cell).toLowerCase().includes(v.toLowerCase());
    });
  }, [rows, filter, admins]);

  const createUser = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
    setSubmitting(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erro ao criar");
    toast.success("Usuário criado");
    setOpenCreate(false);
    setForm({ email: "", password: "", full_name: "", make_admin: false });
    load();
  };

  const startEdit = (row: any) => {
    const p = perfisMap.get(row.user_id) ?? {};
    setEditing(row);
    setEditForm({
      email: "", password: "",
      full_name: row.full_name ?? "",
      perfil: {
        username: p.username ?? "",
        nome_exibicao: p.nome_exibicao ?? "",
        bio: p.bio ?? "",
        avatar_url: p.avatar_url ?? "",
        banner_url: p.banner_url ?? "",
        cidade: p.cidade ?? "",
        pais: p.pais ?? "",
        tipo_perfil: p.tipo_perfil ?? "leitor",
        verificado: !!p.verificado,
        instagram_url: p.instagram_url ?? "",
        youtube_url: p.youtube_url ?? "",
        tiktok_url: p.tiktok_url ?? "",
        site_url: p.site_url ?? "",
      },
      gam: {
        xp_total: row.xp_total?.toString() ?? "",
        nivel: row.nivel?.toString() ?? "",
        streak_atual: row.streak_atual?.toString() ?? "",
        streak_maximo: row.streak_maximo?.toString() ?? "",
      },
      is_admin: admins.has(row.user_id),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const payload: any = {
      action: "update",
      user_id: editing.user_id,
      perfil: editForm.perfil,
      gamificacao: editForm.gam,
      is_admin: editForm.is_admin,
    };
    if (editForm.email) payload.email = editForm.email;
    if (editForm.password) payload.password = editForm.password;
    if (editForm.full_name) payload.full_name = editForm.full_name;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: payload });
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erro");
    toast.success("Usuário atualizado");
    setEditing(null);
    load();
  };

  const removeUser = async (userId: string) => {
    if (userId === me?.id) return toast.error("Você não pode excluir sua própria conta");
    if (!confirm("Excluir este usuário? Ação irreversível.")) return;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: { action: "delete", user_id: userId } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erro");
    toast.success("Usuário excluído");
    load();
  };

  const upPerfil = (k: string, v: any) => setEditForm((f) => ({ ...f, perfil: { ...f.perfil, [k]: v } }));
  const upGam = (k: string, v: any) => setEditForm((f) => ({ ...f, gam: { ...f.gam, [k]: v } }));

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Novo usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <Checkbox id="mk" checked={form.make_admin} onCheckedChange={(v) => setForm({ ...form, make_admin: !!v })} />
                <Label htmlFor="mk">Tornar admin</Label>
              </div>
              <Button onClick={createUser} disabled={submitting} className="w-full">{submitting ? "Criando…" : "Criar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <FilterBar columns={COLUMNS} value={filter} onChange={setFilter} />

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Nível</TableHead><TableHead>XP</TableHead><TableHead>Admin</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isAdmin = admins.has(u.user_id);
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>{u.full_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{u.email ?? "—"}</TableCell>
                      <TableCell>{u.nivel ?? 1}</TableCell>
                      <TableCell>{u.xp_total ?? 0}</TableCell>
                      <TableCell>{isAdmin ? "Sim" : "—"}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(u)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removeUser(u.user_id)} title="Excluir" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <section className="space-y-2">
              <h4 className="font-semibold text-sm">Conta</h4>
              <p className="text-xs text-muted-foreground">Deixe email/senha em branco para não alterar.</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Novo email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div><Label>Nova senha</Label><Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></div>
                <div className="col-span-2"><Label>Nome completo</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <Label htmlFor="adm">Administrador</Label>
                <Switch id="adm" checked={editForm.is_admin} onCheckedChange={(v) => setEditForm({ ...editForm, is_admin: v })} />
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-sm">Perfil público</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Username</Label><Input value={editForm.perfil.username} onChange={(e) => upPerfil("username", e.target.value)} /></div>
                <div><Label>Nome exibição</Label><Input value={editForm.perfil.nome_exibicao} onChange={(e) => upPerfil("nome_exibicao", e.target.value)} /></div>
                <div className="col-span-2"><Label>Bio</Label><Textarea value={editForm.perfil.bio} onChange={(e) => upPerfil("bio", e.target.value)} /></div>
                <div><Label>Avatar URL</Label><Input value={editForm.perfil.avatar_url} onChange={(e) => upPerfil("avatar_url", e.target.value)} /></div>
                <div><Label>Banner URL</Label><Input value={editForm.perfil.banner_url} onChange={(e) => upPerfil("banner_url", e.target.value)} /></div>
                <div><Label>Cidade</Label><Input value={editForm.perfil.cidade} onChange={(e) => upPerfil("cidade", e.target.value)} /></div>
                <div><Label>País</Label><Input value={editForm.perfil.pais} onChange={(e) => upPerfil("pais", e.target.value)} /></div>
                <div>
                  <Label>Tipo de perfil</Label>
                  <Select value={editForm.perfil.tipo_perfil} onValueChange={(v) => upPerfil("tipo_perfil", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leitor">Leitor</SelectItem>
                      <SelectItem value="curador">Curador</SelectItem>
                      <SelectItem value="creator">Creator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <Label htmlFor="vf">Verificado</Label>
                  <Switch id="vf" checked={editForm.perfil.verificado} onCheckedChange={(v) => upPerfil("verificado", v)} />
                </div>
                <div><Label>Instagram</Label><Input value={editForm.perfil.instagram_url} onChange={(e) => upPerfil("instagram_url", e.target.value)} /></div>
                <div><Label>YouTube</Label><Input value={editForm.perfil.youtube_url} onChange={(e) => upPerfil("youtube_url", e.target.value)} /></div>
                <div><Label>TikTok</Label><Input value={editForm.perfil.tiktok_url} onChange={(e) => upPerfil("tiktok_url", e.target.value)} /></div>
                <div><Label>Site</Label><Input value={editForm.perfil.site_url} onChange={(e) => upPerfil("site_url", e.target.value)} /></div>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-sm">Gamificação</h4>
              <div className="grid grid-cols-4 gap-2">
                <div><Label>XP total</Label><Input type="number" value={editForm.gam.xp_total} onChange={(e) => upGam("xp_total", e.target.value)} /></div>
                <div><Label>Nível</Label><Input type="number" value={editForm.gam.nivel} onChange={(e) => upGam("nivel", e.target.value)} /></div>
                <div><Label>Streak atual</Label><Input type="number" value={editForm.gam.streak_atual} onChange={(e) => upGam("streak_atual", e.target.value)} /></div>
                <div><Label>Streak máx</Label><Input type="number" value={editForm.gam.streak_maximo} onChange={(e) => upGam("streak_maximo", e.target.value)} /></div>
              </div>
            </section>

            <Button onClick={saveEdit} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
