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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { Plus, Pencil, Trash2, Building2, Users, UserX } from "lucide-react";
import { CapaUploader } from "@/components/clubes/shared/CapaUploader";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";

const empty = { nome: "", descricao: "", objetivo: "", regras: "", capa: "", duracao_tipo: "continuo", preco: 0, categoria: "", visibilidade: "publico", curadorUsername: "" };

export const ClubesTab = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Modal de edição/criação
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal de membros
  const [membrosClube, setMembrosClube] = useState<{ id: string; nome: string } | null>(null);
  const [membros, setMembros] = useState<any[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [removerMembro, setRemoverMembro] = useState<{ userId: string; nome: string } | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("clubes")
      .select("id, nome, descricao, objetivo, regras, imagem_capa_url, is_ativo, duracao_tipo, preco_centavos, categoria, visibilidade, curador_id")
      .order("created_at", { ascending: false });
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

  const startEdit = async (r: any) => {
    setEditing(r);
    // Busca username do curador atual
    let curadorUsername = "";
    if (r.curador_id) {
      const { data: perfil } = await supabase
        .from("perfis")
        .select("username")
        .eq("user_id", r.curador_id)
        .maybeSingle();
      curadorUsername = perfil?.username ?? "";
    }
    setForm({
      nome: r.nome ?? "", descricao: r.descricao ?? "", objetivo: r.objetivo ?? "",
      regras: r.regras ?? "", capa: r.imagem_capa_url ?? "", duracao_tipo: r.duracao_tipo ?? "continuo",
      preco: r.preco_centavos ?? 0, categoria: r.categoria ?? "", visibilidade: r.visibilidade ?? "publico",
      curadorUsername,
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

    // Resolve curador_id a partir do username digitado
    let novoCuradorId: string | undefined;
    if (form.curadorUsername.trim()) {
      const { data: perfil, error: pe } = await supabase
        .from("perfis")
        .select("user_id")
        .eq("username", form.curadorUsername.trim())
        .maybeSingle();
      if (pe || !perfil) {
        setSaving(false);
        return toast.error(`Usuário "${form.curadorUsername}" não encontrado`);
      }
      novoCuradorId = perfil.user_id;
    }

    const patch: any = {
      nome: form.nome, descricao: form.descricao || null, objetivo: form.objetivo || null,
      regras: form.regras || null, imagem_capa_url: form.capa || null,
      duracao_tipo: form.duracao_tipo, preco_centavos: Number(form.preco) || 0,
      categoria: form.categoria || null, visibilidade: form.visibilidade || "publico",
    };
    if (novoCuradorId) patch.curador_id = novoCuradorId;

    const { error } = await (supabase as any).from("clubes").update(patch).eq("id", editing.id);
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

  // ── Membros ──────────────────────────────────────────────────────────────
  const abrirMembros = async (r: any) => {
    setMembrosClube({ id: r.id, nome: r.nome });
    setCarregandoMembros(true);
    const { data, error } = await supabase
      .from("clube_membros")
      .select("user_id, status, papel, data_entrada, perfis(username, nome_exibicao, avatar_url)")
      .eq("clube_id", r.id)
      .order("data_entrada", { ascending: false });
    setCarregandoMembros(false);
    if (error) { toast.error(error.message); return; }
    setMembros(data ?? []);
  };

  const confirmarRemover = (userId: string, nome: string) => {
    setRemoverMembro({ userId, nome });
  };

  const doRemoverMembro = async () => {
    if (!removerMembro || !membrosClube) return;
    const { error } = await supabase
      .from("clube_membros")
      .delete()
      .eq("clube_id", membrosClube.id)
      .eq("user_id", removerMembro.userId);
    if (error) { toast.error(error.message); setRemoverMembro(null); return; }
    toast.success("Membro removido");
    setRemoverMembro(null);
    setMembros((prev) => prev.filter((m) => m.user_id !== removerMembro.userId));
  };

  // ── Form fields ──────────────────────────────────────────────────────────
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
      {modalOpen === "edit" && (
        <div>
          <Label>Curador (username)</Label>
          <Input
            value={form.curadorUsername}
            onChange={(e) => setForm({ ...form, curadorUsername: e.target.value })}
            placeholder="Digite o username do novo curador"
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Deixe em branco para manter o curador atual.</p>
        </div>
      )}
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
                          <Button size="sm" variant="ghost" onClick={() => abrirMembros(r)} title="Ver membros"><Users className="w-4 h-4" /></Button>
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

      {/* Modal criar */}
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

      {/* Modal editar */}
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

      {/* Modal membros */}
      <Dialog open={!!membrosClube} onOpenChange={(o) => { if (!o) { setMembrosClube(null); setMembros([]); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membros — {membrosClube?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {carregandoMembros ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : membros.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum membro encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membros.map((m) => {
                    const perfil = (m as any).perfis;
                    const nome = perfil?.nome_exibicao || perfil?.username || m.user_id.slice(0, 8);
                    return (
                      <TableRow key={m.user_id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{nome}</span>
                            {perfil?.username && perfil?.nome_exibicao && (
                              <span className="text-xs text-muted-foreground">@{perfil.username}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{m.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.data_entrada ? new Date(m.data_entrada).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-7 px-2"
                            onClick={() => confirmarRemover(m.user_id, nome)}
                            title="Remover membro"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {membros.length} membro{membros.length !== 1 ? "s" : ""}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão de clube */}
      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir clube?"
        description="Se houver membros ou conteúdos vinculados, prefira desativar. A exclusão é irreversível."
        confirmLabel="Excluir clube"
        onConfirm={doDelete}
      />

      {/* Confirmar remoção de membro */}
      <AdminConfirmDialog
        open={!!removerMembro}
        onOpenChange={(o) => !o && setRemoverMembro(null)}
        title="Remover membro?"
        description={`"${removerMembro?.nome}" será removido do clube. O histórico de leitura permanece.`}
        confirmLabel="Remover"
        onConfirm={doRemoverMembro}
      />
    </div>
  );
};
