import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookCopy, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AdminModal } from "../../components/AdminModal";
import { AdminConfirmDialog } from "../../components/AdminConfirmDialog";

export const FORMATOS_EDICAO = [
  { value: "fisico_brochura", label: "Físico (brochura)" },
  { value: "fisico_capa_dura", label: "Físico (capa dura)" },
  { value: "ebook", label: "eBook" },
  { value: "audiobook", label: "Audiobook" },
] as const;

const rotuloFormato = (f: string) => FORMATOS_EDICAO.find((x) => x.value === f)?.label ?? f;

const draftKey = (obraId: string) => `draft-admin-edicao-${obraId}`;

type Edicao = {
  id: string;
  obra_id: string;
  titulo_edicao: string;
  editora: string;
  formato: string;
  idioma: string;
  isbn_13: string | null;
  isbn10: string | null;
  num_paginas: number | null;
  capa_url: string | null;
  preco_capa_centavos: number | null;
  fonte_dados: string;
  leitores?: number;
};

const vazio = {
  titulo_edicao: "",
  editora: "",
  formato: "fisico_brochura",
  idioma: "pt-BR",
  isbn_13: "",
  isbn10: "",
  num_paginas: "",
  capa_url: "",
  preco: "",
  fonte_dados: "manual",
};

type FormEdicao = typeof vazio;

const centavosParaTexto = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
const textoParaCentavos = (s: string) => {
  const limpo = s.trim().replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

interface Props {
  obraId: string;
  tituloObra: string;
  /** Chamado quando a quantidade de edições muda (para atualizar a listagem). */
  onChange?: () => void;
}

/**
 * Lista e gerencia (criar / editar / excluir) as edições de uma obra no Admin.
 */
export const EdicoesObraSection = ({ obraId, tituloObra, onChange }: Props) => {
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editando, setEditando] = useState<Edicao | null>(null);
  const [form, setForm] = useState<FormEdicao>(vazio);
  const [saving, setSaving] = useState(false);
  const [excluir, setExcluir] = useState<Edicao | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("edicoes")
      .select("*, usuario_livros(count)")
      .eq("obra_id", obraId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setEdicoes(
      (data ?? []).map((e: any) => ({ ...e, leitores: e.usuario_livros?.[0]?.count ?? 0 }))
    );
    setLoading(false);
  }, [obraId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Rascunho — apenas no formulário de criação
  useEffect(() => {
    if (modal !== "create") return;
    const raw = localStorage.getItem(draftKey(obraId));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setForm((f) => ({ ...f, ...d }));
    } catch {}
  }, [modal, obraId]);

  useEffect(() => {
    if (modal !== "create") return;
    localStorage.setItem(draftKey(obraId), JSON.stringify(form));
  }, [modal, obraId, form]);

  const abrirCriar = () => {
    setEditando(null);
    setForm({ ...vazio, titulo_edicao: tituloObra });
    setModal("create");
  };

  const abrirEditar = (e: Edicao) => {
    setEditando(e);
    setForm({
      titulo_edicao: e.titulo_edicao ?? "",
      editora: e.editora ?? "",
      formato: e.formato ?? "fisico_brochura",
      idioma: e.idioma ?? "pt-BR",
      isbn_13: e.isbn_13 ?? "",
      isbn10: e.isbn10 ?? "",
      num_paginas: e.num_paginas?.toString() ?? "",
      capa_url: e.capa_url ?? "",
      preco: centavosParaTexto(e.preco_capa_centavos),
      fonte_dados: e.fonte_dados ?? "manual",
    });
    setModal("edit");
  };

  const montarPayload = () => {
    if (!form.titulo_edicao.trim()) { toast.error("Título da edição obrigatório"); return null; }
    if (!form.editora.trim()) { toast.error("Editora obrigatória"); return null; }
    const isbn13 = form.isbn_13.replace(/[^0-9Xx]/g, "");
    const isbn10 = form.isbn10.replace(/[^0-9Xx]/g, "");
    if (isbn13 && isbn13.length !== 13) { toast.error("ISBN-13 deve ter 13 dígitos"); return null; }
    if (isbn10 && isbn10.length !== 10) { toast.error("ISBN-10 deve ter 10 caracteres"); return null; }
    const paginas = form.num_paginas ? Number(form.num_paginas) : null;
    if (paginas !== null && (!Number.isInteger(paginas) || paginas < 0)) { toast.error("Número de páginas inválido"); return null; }
    const preco = textoParaCentavos(form.preco);
    if (Number.isNaN(preco)) { toast.error("Preço inválido"); return null; }
    return {
      titulo_edicao: form.titulo_edicao.trim(),
      editora: form.editora.trim(),
      formato: form.formato,
      idioma: form.idioma.trim() || "pt-BR",
      isbn_13: isbn13 || null,
      isbn10: isbn10.toUpperCase() || null,
      num_paginas: paginas,
      capa_url: form.capa_url.trim() || null,
      preco_capa_centavos: preco,
      fonte_dados: form.fonte_dados.trim() || "manual",
    };
  };

  const salvar = async () => {
    const payload = montarPayload();
    if (!payload) return;
    setSaving(true);
    const { error } = modal === "create"
      ? await (supabase as any).from("edicoes").insert({ ...payload, obra_id: obraId })
      : await (supabase as any)
          .from("edicoes")
          .update({ ...payload, atualizado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", editando!.id);
    setSaving(false);
    if (error) {
      return toast.error(error.code === "23505" ? "Já existe uma edição com este ISBN-13" : error.message);
    }
    if (modal === "create") localStorage.removeItem(draftKey(obraId));
    toast.success(modal === "create" ? "Edição criada" : "Edição atualizada");
    setModal(null);
    setEditando(null);
    setForm(vazio);
    carregar();
    onChange?.();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await (supabase as any).from("edicoes").delete().eq("id", excluir.id);
    if (error) return toast.error(error.message);
    toast.success("Edição excluída");
    setExcluir(null);
    carregar();
    onChange?.();
  };

  const set = (campo: keyof FormEdicao) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookCopy className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Edições</Label>
        {!loading && <span className="text-xs text-muted-foreground">({edicoes.length})</span>}
        <Button size="sm" variant="outline" className="ml-auto h-8" onClick={abrirCriar}>
          <Plus className="w-4 h-4" />Nova edição
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : edicoes.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-md p-4 text-center">
          Nenhuma edição cadastrada para este livro.
        </p>
      ) : (
        <ul className="space-y-2">
          {edicoes.map((e) => (
            <li key={e.id} className="flex gap-3 border rounded-md p-3 hover:bg-muted/40 transition-colors">
              {e.capa_url ? (
                <img src={e.capa_url} alt="" className="w-10 h-14 object-cover rounded shrink-0 bg-muted" />
              ) : (
                <div className="w-10 h-14 rounded bg-muted shrink-0 flex items-center justify-center">
                  <BookCopy className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <button type="button" className="flex-1 min-w-0 text-left" onClick={() => abrirEditar(e)}>
                <p className="text-sm font-medium truncate">{e.titulo_edicao}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {e.editora} · {rotuloFormato(e.formato)} · {e.idioma}
                  {e.num_paginas ? ` · ${e.num_paginas} p.` : ""}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {e.isbn_13 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">ISBN {e.isbn_13}</Badge>}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                    <Users className="h-3 w-3" />{e.leitores}
                  </Badge>
                </div>
              </button>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => abrirEditar(e)} title="Editar edição">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => setExcluir(e)}
                  title={e.leitores ? "Edição em uso por leitores" : "Excluir edição"}
                  disabled={!!e.leitores}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminModal
        open={modal !== null}
        onOpenChange={(o) => { if (!o) { setModal(null); setEditando(null); } }}
        title={modal === "create" ? "Nova edição" : "Editar edição"}
        description={tituloObra}
        onConfirm={salvar}
        confirmLabel={modal === "create" ? "Criar" : "Salvar"}
        isLoading={saving}
        size="lg"
      >
        <div className="space-y-3">
          <div>
            <Label>Título da edição <span className="text-destructive">*</span></Label>
            <Input value={form.titulo_edicao} onChange={set("titulo_edicao")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Editora <span className="text-destructive">*</span></Label>
              <Input value={form.editora} onChange={set("editora")} />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={form.formato} onValueChange={(v) => setForm((f) => ({ ...f, formato: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATOS_EDICAO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ISBN-13</Label>
              <Input value={form.isbn_13} onChange={set("isbn_13")} inputMode="numeric" placeholder="978…" />
            </div>
            <div>
              <Label>ISBN-10</Label>
              <Input value={form.isbn10} onChange={set("isbn10")} />
            </div>
            <div>
              <Label>Idioma</Label>
              <Input value={form.idioma} onChange={set("idioma")} placeholder="pt-BR, en, es…" />
            </div>
            <div>
              <Label>Nº de páginas</Label>
              <Input type="number" min={0} value={form.num_paginas} onChange={set("num_paginas")} />
            </div>
            <div>
              <Label>Preço de capa (R$)</Label>
              <Input value={form.preco} onChange={set("preco")} inputMode="decimal" placeholder="49,90" />
            </div>
            <div>
              <Label>Fonte dos dados</Label>
              <Input value={form.fonte_dados} onChange={set("fonte_dados")} placeholder="manual" />
            </div>
          </div>
          <div>
            <Label>Capa (URL)</Label>
            <div className="flex gap-3 items-start">
              <Input value={form.capa_url} onChange={set("capa_url")} placeholder="https://…" />
              {form.capa_url && <img src={form.capa_url} alt="" className="w-10 h-14 object-cover rounded shrink-0 bg-muted" />}
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir edição?"
        description={`A edição "${excluir?.titulo_edicao ?? ""}" será removida permanentemente.`}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
};
