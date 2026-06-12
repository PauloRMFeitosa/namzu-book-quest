import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const GamificacaoTab = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalXP: 0, conquistas: 0 });
  const [top, setTop] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: perfis }, { count: conqCount }] = await Promise.all([
        supabase.from("gamificacao_perfis").select("user_id, xp_total, nivel, streak_atual").order("xp_total", { ascending: false }),
        supabase.from("usuario_conquistas").select("*", { count: "exact", head: true }),
      ]);
      const list = perfis ?? [];
      setStats({
        totalUsers: list.length,
        totalXP: list.reduce((s, p: any) => s + (p.xp_total ?? 0), 0),
        conquistas: conqCount ?? 0,
      });
      setTop(list.slice(0, 20));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground py-6">Carregando…</p>;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Usuários</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalUsers}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">XP total</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalXP}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Conquistas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.conquistas}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 20 — Ranking</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>#</TableHead><TableHead>Usuário</TableHead><TableHead>Nível</TableHead><TableHead>XP</TableHead><TableHead>Streak</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {top.map((p, i) => (
                <TableRow key={p.user_id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{p.user_id.slice(0, 8)}…</TableCell>
                  <TableCell>{p.nivel}</TableCell>
                  <TableCell>{p.xp_total}</TableCell>
                  <TableCell>{p.streak_atual}</TableCell>
                </TableRow>
              ))}
              {top.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
