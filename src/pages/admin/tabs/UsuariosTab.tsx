import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Shield, ShieldOff } from "lucide-react";

export const UsuariosTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", make_admin: false });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: perfis }, { data: roles }] = await Promise.all([
      supabase.from("gamificacao_perfis").select("user_id, xp_total, nivel, streak_atual").order("xp_total", { ascending: false }),
      (supabase as any).from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    setRows(perfis ?? []);
    setAdmins(new Set((roles ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await (supabase as any).from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removido");
    } else {
      const { error } = await (supabase as any).from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin atribuído");
    }
    load();
  };

  const createUser = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Erro ao criar");
      return;
    }
    toast.success("Usuário criado");
    setOpen(false);
    setForm({ email: "", password: "", full_name: "", make_admin: false });
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4" />Novo usuário</Button>
          </DialogTrigger>
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

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nível</TableHead><TableHead>XP</TableHead><TableHead>Admin</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((u) => {
                  const isAdmin = admins.has(u.user_id);
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-mono text-xs">{u.user_id.slice(0, 8)}…</TableCell>
                      <TableCell>{u.nivel}</TableCell>
                      <TableCell>{u.xp_total}</TableCell>
                      <TableCell>{isAdmin ? "Sim" : "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u.user_id, isAdmin)}>
                          {isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
