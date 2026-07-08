import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, BookOpen, X, Users, Tag, Globe } from "lucide-react";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { AdminSortableHead } from "../components/AdminSortableHead";
import { AdminPageSizeSelect, PageSize } from "../components/AdminPageSizeSelect";
import { AdminModal } from "../components/AdminModal";
import { useSortable } from "../hooks/useSortable";
import { EnriquecerObraWikidataDialog } from "./livros/EnriquecerObraWikidataDialog";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const empty = { titulo_original: "", ano: "", sinopse: "", capa_url: "", idioma: "pt-BR" };

type Autor = { id: string; nome_completo: string };
type Genero = { id: string; nome: string };

export const LivrosTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [wikidataTarget, setWikidataTarget] = useState<{ id: string; titulo_original: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Author + genre lists (loaded once)
  const [autoresList, setAutoresList] = useState<Autor[]>([]);
  const [generosList, setGenerosList] = useState<Genero[]>([]);

  // Current modal selection (sets of IDs)
  const [autorIds, setAutorIds] = useState<Set<string>>(new Set());
  const [generoIds, setGeneroIds] = useState<Set<string>>(new Set());
  const [autorSearch, setAutorSearch] = useState("");
  const [generoSearch, setGeneroSearch] = useState("");

  // ── Loaders ─────────────────────────────────────────────
  const load = async () => {
    const { data } = await (supabase as any)
      .from("obras")
      .select("id, titulo_original, ano_primeira_publicacao, idioma_original, obra_autores(ordem, autores(id, nome_completo))")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };

  const loadLists = useCallback(async () => {
    const [{ data: aut }, { data: gen }] = await Promise.all([
      (supabase as any).from("autores").select("id, nome_completo").order("nome_ordenacao").limit(1000),
      (supabase as any).from("generos").select("id, nome").order("nome").limit(500),
    ]);
    setAutoresList(aut ?? []);
    setGenerosList(gen ?? []);
  }, []);

  useEffect(() => { load(); loadLists(); }, [loadLists]);

  // ── Helpers ──────────────────────────────────────────────
  const primaryAutor = (row: any) =>
    [...(row.obra_autores ?? [])]
      .sort((a: any, b: any) => (a.ordem ?? 1) - (b.ordem ?? 1))[0]
      ?.autores?.nome_completo ?? "—";

  const filtered = rows.filter((r) =>
    r.titulo_original?.toLowerCase().includes(search.toLowerCase())
  );

  const [pageSize, setPageSize] = useState<PageSize>(100);
  const { sorted, sort, toggle } = useSortable(filtered, (row, col) => {
    if (col === "titulo") return row.titulo_original ?? "";
    if (col === "autor") return primaryAutor(row);
    if (col === "ano") return row.ano_primeira_publicacao ?? 0;
    if (col === "idioma") return row.idioma_original ?? "";
    return "";
  });
  const paged = sorted.slice(0, pageSize);

  const toggleAutor = (id: string) =>
    setAutorIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toggleGenero = (id: string) =>
    setGeneroIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ── Modal openers ────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setAutorIds(new Set());
    setGeneroIds(new Set());
    setAutorSearch("");
    setGeneroSearch("");
    setModalOpen("create");
  };

  const startEdit = async (r: any) => {
    setEditing(r);
    setForm({
      titulo_original: r.titulo_original ?? "",
      ano: r.ano_primeira_publicacao?.toString() ?? "",
      sinopse: "",
      capa_url: "",
      idioma: r.idioma_original ?? "pt-BR",
    });
    setAutorSearch("");
    setGeneroSearch("");
    setModalOpen("edit");

    // Load full sinopse + capa + relations in parallel
    const [{ data: obra }, { data: oas }, { data: ogs }] = await Promise.all([
      (supabase as any).from("obras").select("sinopse_padrao, capa_padrao_url").eq("id", r.id).single(),
      (supabase as any).from("obra_autores").select("autor_id").eq("obra_id", r.id),
      (supabase as any).from("obra_generos").select("genero_id").eq("obra_id", r.id),
    ]);
    if (obra) setForm((f) => ({ ...f, sinopse: obra.sinopse_padrao ?? "", capa_url: obra.capa_padrao_url ?? "" }));
    setAutorIds(new Set((oas ?? []).map((oa: any) => oa.autor_id)));
    setGeneroIds(new Set((ogs ?? []).map((og: any) => og.genero_id)));
  };

  // ── Relations helper ─────────────────────────────────────
  const saveRelations = async (obraId: string) => {
    await Promise.all([
      (supabase as any).from("obra_autores").delete().eq("obra_id", obraId),
      (supabase as any).from("obra_generos").delete().eq("obra_id", obraId),
    ]);
    const inserts: Promise<any>[] = [];
    if (autorIds.size > 0) {
      inserts.push(
        (supabase as any).from("obra_autores").insert(
          [...autorIds].map((aid, i) => ({ obra_id: obraId, autor_id: aid, funcao: "autor", ordem: i + 1 }))
        )
      );
    }
    if (generoIds.size > 0) {
      inserts.push(
        (supabase as any).from("obra_generos").insert(
          [...generoIds].map((gid) => ({ obra_id: obraId, genero_id: gid }))
        )
      );
    }
    await Promise.all(inserts);
  };

  // ── CRUD ─────────────────────────────────────────────────
  const buildPayload = () => ({
    titulo_original: form.titulo_original,
    titulo_ordenacao: form.titulo_original,
    idioma_original: form.idioma,
    sinopse_padrao: form.sinopse || null,
    capa_padrao_url: form.capa_url || null,
    ano_primeira_publicacao: form.ano ? Number(form.ano) : null,
  });

  const create = async () => {
    if (!form.titulo_original) return toast.error("Título obrigatório");
    setSaving(true);
    const slug = slugify(form.titulo_original) + "-" + Date.now().toString(36).slice(-4);
    const { data: newObra, error } = await (supabase as any)
      .from("obras").insert({ ...buildPayload(), slug }).select("id").single();
    if (error) { setSaving(false); return toast.error(error.message); }
    await saveRelations(newObra.id);
    toast.success("Livro criado");
    setSaving(false);
    setModalOpen(null);
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await (supabase as any).from("obras").update(buildPayload()).eq("id", editing.id);
    if (error) { setSaving(false); return toast.error(error.message); }
    await saveRelations(editing.id);
    toast.success("Livro atualizado");
    setSaving(false);
    setModalOpen(null);
    setEditing(null);
    load();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("obras").delete().eq("id", deleteTarget);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleteTarget(null); load();
  };

  // ── Filtered lists for multi-selects ─────────────────────
  const filteredAutores = autoresList.filter((a) =>
    a.nome_completo.toLowerCase().includes(autorSearch.toLowerCase())
  );
  const filteredGeneros = generosList.filter((g) =>
    g.nome.toLowerCase().includes(generoSearch.toLowerCase())
  );
  const selectedAutoresList = autoresList.filter((a) => autorIds.has(a.id));
  const selectedGenerosList = generosList.filter((g) => generoIds.has(g.id));

  // ── Form JSX ──────────────────────────────────────────────
  const formFields = (
    <div className="space-y-4">
      {/* Core fields */}
      <div className="space-y-3">
        <div>
          <Label>Título <span className="text-destructive">*</span></Label>
          <Input value={form.titulo_original} onChange={(e) => setForm({ ...form, titulo_original: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ano de publicação</Label>
            <Input type="number" placeholder="ex: 1956" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
          </div>
          <div>
            <Label>Idioma original</Label>
            <Input value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })} placeholder="pt-BR, en, es…" />
          </div>
        </div>
        <div>
          <Label>Capa (URL)</Label>
          <Input value={form.capa_url} onChange={(e) => setForm({ ...form, capa_url: e.target.value })} placeholder="https://…" />
        </div>
        <div>
          <Label>Sinopse</Label>
          <Textarea rows={3} value={form.sinopse} onChange={(e) => setForm({ ...form, sinopse: e.target.value })} />
        </div>
      </div>

      {/* Autores */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Autores</Label>
          {autorIds.size > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">{autorIds.size} selecionado{autorIds.size !== 1 ? "s" : ""}</span>
          )}
        </div>
        {selectedAutoresList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedAutoresList.map((a) => (
              <Badge key={a.id} variant="secondary" className="gap-1 pr-1">
                {a.nome_completo}
                <button onClick={() => toggleAutor(a.id)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Input
          placeholder="Filtrar autores…"
          value={autorSearch}
          onChange={(e) => setAutorSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="border rounded-md max-h-36 overflow-y-auto">
          {filteredAutores.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum resultado</p>
          ) : (
            filteredAutores.map((a) => (
              <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox
                  checked={autorIds.has(a.id)}
                  onCheckedChange={() => toggleAutor(a.id)}
                />
                {a.nome_completo}
              </label>
            ))
          )}
        </div>
      </div>

      {/* Gêneros */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Gêneros</Label>
          {generoIds.size > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">{generoIds.size} selecionado{generoIds.size !== 1 ? "s" : ""}</span>
          )}
        </div>
        {selectedGenerosList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedGenerosList.map((g) => (
              <Badge key={g.id} variant="outline" className="gap-1 pr-1">
                {g.nome}
                <button onClick={() => toggleGenero(g.id)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Input
          placeholder="Filtrar gêneros…"
          value={generoSearch}
          onChange={(e) => setGeneroSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="border rounded-md max-h-36 overflow-y-auto">
          {filteredGeneros.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum resultado</p>
          ) : (
            filteredGeneros.map((g) => (
              <label key={g.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox
                  checked={generoIds.has(g.id)}
                  onCheckedChange={() => toggleGenero(g.id)}
                />
                {g.nome}
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Buscar por título..." />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />Novo livro
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Livros {!loading && <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <AdminEmptyState icon={BookOpen} title="Nenhum livro encontrado" description={search ? `Nenhum resultado para "${search}".` : "Ainda não há livros cadastrados."} actionLabel="Novo livro" onAction={openCreate} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <AdminSortableHead col="titulo" label="Título" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="autor" label="Autor principal" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="ano" label="Ano" sort={sort} onToggle={toggle} />
                    <AdminSortableHead col="idioma" label="Idioma" sort={sort} onToggle={toggle} />
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.titulo_original}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{primaryAutor(r)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.ano_primeira_publicacao ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.idioma_original ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setWikidataTarget({ id: r.id, titulo_original: r.titulo_original })} title="Enriquecer via Wikidata"><Globe className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(r.id)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center gap-4 pt-3 border-t mt-1 text-xs text-muted-foreground">
                <span>{paged.length < filtered.length ? `Exibindo ${paged.length} de ${filtered.length}` : `${filtered.length} livro${filtered.length !== 1 ? "s" : ""}`}</span>
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
        title="Cadastrar livro"
        onConfirm={create}
        confirmLabel="Criar"
        isLoading={saving}
        size="lg"
      >
        {formFields}
      </AdminModal>

      {/* Edit modal */}
      <AdminModal
        open={modalOpen === "edit"}
        onOpenChange={(o) => { if (!o) { setModalOpen(null); setEditing(null); } }}
        title="Editar livro"
        onConfirm={saveEdit}
        confirmLabel="Salvar"
        isLoading={saving}
        size="lg"
      >
        {formFields}
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir livro?"
        description="Este livro será removido permanentemente do catálogo, incluindo vínculos com autores e gêneros."
        onConfirm={doDelete}
      />

      {wikidataTarget && (
        <EnriquecerObraWikidataDialog
          obra={wikidataTarget}
          open={!!wikidataTarget}
          onClose={(refresh) => {
            setWikidataTarget(null);
            if (refresh) load();
          }}
        />
      )}
    </div>
  );
};
