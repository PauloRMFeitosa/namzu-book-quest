import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagsInput } from "@/components/leituras/TagsInput";
import { AutorAutocomplete } from "@/components/cadastro-manual/AutorAutocomplete";
import { ObraAutocomplete } from "@/components/cadastro-manual/ObraAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { criarUsuarioLeitura } from "@/hooks/leituras/useLeituraActions";
import { invalidateLeituras } from "@/lib/queryInvalidation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const obraSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(300),
  autor: z.string().trim().min(1, "Autor obrigatório").max(200),
  ano: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{1,4}$/.test(v), "Ano inválido"),
  capa_url: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
  sinopse: z.string().max(5000).optional(),
});

const autorSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(200),
});

const edicaoSchema = z.object({
  obra_id: z.string().uuid("Selecione uma obra"),
  titulo_edicao: z.string().trim().min(1, "Título obrigatório").max(300),
  editora: z.string().trim().min(1, "Editora obrigatória").max(200),
  formato: z.enum(["ebook", "fisico_brochura", "fisico_capa_dura", "audiobook"]),
  idioma: z.string().min(2).max(10),
  isbn_13: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{13}$/.test(v), "ISBN-13 deve ter 13 dígitos"),
  num_paginas: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Páginas inválido"),
  capa_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  preco: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+([.,]\d{1,2})?$/.test(v), "Preço inválido"),
});

const CadastroManual = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Pré-preenchimento vindo da busca sem resultados (/busca → "Cadastrar este livro")
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("obra");

  // ---------- OBRA ----------
  const [obraTitulo, setObraTitulo] = useState(() => searchParams.get("titulo") ?? "");
  const [obraAutor, setObraAutor] = useState(() => searchParams.get("autor") ?? "");
  const [coautores, setCoautores] = useState<string[]>([]);
  const [obraAno, setObraAno] = useState("");
  const [obraIdioma, setObraIdioma] = useState("pt-BR");
  const [obraSinopse, setObraSinopse] = useState("");
  const [obraCapa, setObraCapa] = useState("");
  const [obraStatus, setObraStatus] = useState<"quero_ler" | "lendo" | "concluido">(
    "quero_ler",
  );
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [obraEditora, setObraEditora] = useState("");
  const [obraFormato, setObraFormato] = useState("fisico_brochura");
  const [obraPaginas, setObraPaginas] = useState("");
  const [savingObra, setSavingObra] = useState(false);

  // ---------- AUTOR ----------
  const [autorNome, setAutorNome] = useState("");
  const [savingAutor, setSavingAutor] = useState(false);

  // ---------- EDIÇÃO ----------
  const [edObraTitulo, setEdObraTitulo] = useState("");
  const [edObraId, setEdObraId] = useState<string | null>(null);
  const [edTitulo, setEdTitulo] = useState("");
  const [edEditora, setEdEditora] = useState("");
  const [edFormato, setEdFormato] = useState<"ebook" | "fisico_brochura" | "fisico_capa_dura" | "audiobook">("fisico_brochura");
  const [edIdioma, setEdIdioma] = useState("pt-BR");
  const [edIsbn, setEdIsbn] = useState(() => searchParams.get("isbn") ?? "");
  const [edPaginas, setEdPaginas] = useState("");
  const [edCapa, setEdCapa] = useState("");
  const [edPreco, setEdPreco] = useState("");
  const [savingEdicao, setSavingEdicao] = useState(false);

  const resetObra = () => {
    setObraTitulo("");
    setObraAutor("");
    setCoautores([]);
    setObraAno("");
    setObraSinopse("");
    setObraCapa("");
    setObraEditora("");
    setObraFormato("fisico_brochura");
    setObraPaginas("");
    setObraStatus("quero_ler");
    setDataInicio("");
    setDataFim(new Date().toISOString().slice(0, 10));
    setNota("");
  };

  const salvarObra = async (acaoDepois: "ver" | "outra") => {
    const parsed = obraSchema.safeParse({
      titulo: obraTitulo,
      autor: obraAutor,
      ano: obraAno,
      capa_url: obraCapa,
      sinopse: obraSinopse,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return toast.error(first ?? "Dados inválidos");
    }
    if (!user) return toast.error("Faça login");
    setSavingObra(true);
    try {
      const { data, error } = await supabase.functions.invoke("rapid-action", {
        body: {
          mode: "manual_obra",
          titulo: obraTitulo.trim(),
          autor: obraAutor.trim(),
          autores_extras: coautores,
          ano: obraAno ? Number(obraAno) : null,
          idioma: obraIdioma,
          sinopse: obraSinopse || null,
          capa_url: obraCapa || null,
          editora: obraEditora || null,
          formato: obraFormato,
          num_paginas: obraPaginas ? Number(obraPaginas) : null,
        },
      });
      if (error) throw error;
      const obraId = data?.obra?.id;
      const edicaoId: string | null = data?.edicao_id ?? null;
      if (!obraId) throw new Error("Resposta inválida");

      // edicao_id ausente é preenchido pelo trigger fn_auto_edicao_id_from_obra
      const { data: ulNovo, error: ulErr } = await supabase
        .from("usuario_livros")
        .insert({
          user_id: user.id,
          obra_id: obraId,
          ...(edicaoId ? { edicao_id: edicaoId } : {}),
          status: obraStatus,
          data_inicio: obraStatus !== "quero_ler" ? dataInicio || null : null,
          data_fim: obraStatus === "concluido" ? dataFim || null : null,
          nota: obraStatus === "concluido" && nota ? Number(nota) : null,
        } as TablesInsert<"usuario_livros">)
        .select("id")
        .single();
      if (ulErr && ulErr.code !== "23505") throw ulErr;

      // Ao marcar como "Lendo", cria a experiência em usuario_leituras — mesmo
      // fluxo do "Iniciar leitura" — para o livro aparecer nas listas "Em
      // andamento" (Home) e "Lendo" (Leituras), que leem de usuario_leituras.
      if (obraStatus === "lendo" && ulNovo?.id) {
        try {
          await criarUsuarioLeitura({ usuario_livro_id: ulNovo.id });
        } catch (e) {
          console.warn("Falha ao criar experiência de leitura", e);
        }
      }

      toast.success("Obra cadastrada");
      invalidateLeituras(qc);

      if (acaoDepois === "ver") {
        navigate(`/livros`);
      } else {
        resetObra();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSavingObra(false);
    }
  };

  const salvarAutor = async () => {
    const parsed = autorSchema.safeParse({ nome: autorNome });
    if (!parsed.success) {
      return toast.error(parsed.error.flatten().fieldErrors.nome?.[0] ?? "Inválido");
    }
    setSavingAutor(true);
    try {
      const { data, error } = await supabase.functions.invoke("rapid-action", {
        body: { mode: "manual_autor", nome: autorNome.trim() },
      });
      if (error) throw error;
      toast.success(data?.criado ? "Autor cadastrado" : "Autor já existia");
      setAutorNome("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSavingAutor(false);
    }
  };

  const salvarEdicao = async () => {
    const parsed = edicaoSchema.safeParse({
      obra_id: edObraId ?? "",
      titulo_edicao: edTitulo,
      editora: edEditora,
      formato: edFormato,
      idioma: edIdioma,
      isbn_13: edIsbn,
      num_paginas: edPaginas,
      capa_url: edCapa,
      preco: edPreco,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return toast.error(first ?? "Dados inválidos");
    }
    setSavingEdicao(true);
    try {
      const precoCent = edPreco
        ? Math.round(parseFloat(edPreco.replace(",", ".")) * 100)
        : null;
      const { error } = await supabase.functions.invoke("rapid-action", {
        body: {
          mode: "manual_edicao",
          obra_id: edObraId,
          titulo_edicao: edTitulo.trim(),
          editora: edEditora.trim(),
          formato: edFormato,
          idioma: edIdioma,
          isbn_13: edIsbn || null,
          num_paginas: edPaginas ? Number(edPaginas) : null,
          capa_url: edCapa || null,
          preco_capa_centavos: precoCent,
        },
      });
      if (error) throw error;
      toast.success("Edição cadastrada");
      setEdObraTitulo("");
      setEdObraId(null);
      setEdTitulo("");
      setEdEditora("");
      setEdIsbn("");
      setEdPaginas("");
      setEdCapa("");
      setEdPreco("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSavingEdicao(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Cadastro manual</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="obra">Obra</TabsTrigger>
          <TabsTrigger value="autor">Autor</TabsTrigger>
          <TabsTrigger value="edicao">Edição</TabsTrigger>
        </TabsList>

        {/* OBRA */}
        <TabsContent value="obra" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <Label>Título *</Label>
            <Input
              value={obraTitulo}
              onChange={(e) => setObraTitulo(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Autor principal *</Label>
            <AutorAutocomplete value={obraAutor} onChange={(n) => setObraAutor(n)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Coautores (opcional)</Label>
            <TagsInput tags={coautores} onChange={setCoautores} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Ano</Label>
              <Input
                value={obraAno}
                onChange={(e) => setObraAno(e.target.value)}
                inputMode="numeric"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Idioma</Label>
              <Select value={obraIdioma} onValueChange={setObraIdioma}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="fr">Francês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Sinopse</Label>
            <Textarea
              value={obraSinopse}
              onChange={(e) => setObraSinopse(e.target.value)}
              rows={4}
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>URL da capa</Label>
            <Input
              value={obraCapa}
              onChange={(e) => setObraCapa(e.target.value)}
              placeholder="https://…"
              className="h-11 rounded-xl"
            />
            {obraCapa && (
              <img
                src={obraCapa}
                alt=""
                className="w-20 h-28 rounded-md object-cover mt-1"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Editora</Label>
              <Input
                value={obraEditora}
                onChange={(e) => setObraEditora(e.target.value)}
                placeholder="Não informada"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Páginas</Label>
              <Input
                value={obraPaginas}
                onChange={(e) => setObraPaginas(e.target.value)}
                inputMode="numeric"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Formato</Label>
            <Select value={obraFormato} onValueChange={setObraFormato}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisico_brochura">Físico (brochura)</SelectItem>
                <SelectItem value="fisico_capa_dura">Físico (capa dura)</SelectItem>
                <SelectItem value="ebook">eBook</SelectItem>
                <SelectItem value="audiobook">Audiobook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 p-3 rounded-xl bg-muted">
            <Label>Status na minha lista</Label>
            <RadioGroup
              value={obraStatus}
              onValueChange={(v) => setObraStatus(v as any)}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="quero_ler" id="s-querer" />
                <Label htmlFor="s-querer" className="font-normal">
                  Quero ler
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lendo" id="s-lendo" />
                <Label htmlFor="s-lendo" className="font-normal">
                  Lendo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="concluido" id="s-lido" />
                <Label htmlFor="s-lido" className="font-normal">
                  Já lido
                </Label>
              </div>
            </RadioGroup>

            {obraStatus !== "quero_ler" && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                {obraStatus === "concluido" && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Conclusão</Label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}
            {obraStatus === "concluido" && (
              <div className="flex flex-col gap-1.5 mt-1">
                <Label className="text-xs">Nota (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => salvarObra("outra")}
              disabled={savingObra}
              className="flex-1 rounded-xl"
            >
              {savingObra ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar e adicionar outra"}
            </Button>
            <Button
              onClick={() => salvarObra("ver")}
              disabled={savingObra}
              className="flex-1 rounded-xl bg-primary hover:bg-primary-hover"
            >
              {savingObra ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </TabsContent>

        {/* AUTOR */}
        <TabsContent value="autor" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nome completo *</Label>
            <Input
              value={autorNome}
              onChange={(e) => setAutorNome(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Autores duplicados são detectados automaticamente.
            </p>
          </div>
          <Button
            onClick={salvarAutor}
            disabled={savingAutor}
            className="rounded-xl bg-primary hover:bg-primary-hover"
          >
            {savingAutor ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar autor"}
          </Button>
        </TabsContent>

        {/* EDIÇÃO */}
        <TabsContent value="edicao" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <Label>Obra *</Label>
            <ObraAutocomplete
              value={edObraTitulo}
              obraId={edObraId}
              onChange={(t, id) => {
                setEdObraTitulo(t);
                setEdObraId(id);
                if (id && !edTitulo) setEdTitulo(t);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Não encontrou?{" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setTab("obra")}
              >
                Cadastrar obra
              </button>
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Título da edição *</Label>
            <Input
              value={edTitulo}
              onChange={(e) => setEdTitulo(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Editora *</Label>
              <Input
                value={edEditora}
                onChange={(e) => setEdEditora(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Formato *</Label>
              <Select value={edFormato} onValueChange={(v) => setEdFormato(v as any)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisico_brochura">Físico (brochura)</SelectItem>
                  <SelectItem value="fisico_capa_dura">Físico (capa dura)</SelectItem>
                  <SelectItem value="ebook">eBook</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Idioma</Label>
              <Select value={edIdioma} onValueChange={setEdIdioma}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="fr">Francês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>ISBN-13</Label>
              <Input
                value={edIsbn}
                onChange={(e) => setEdIsbn(e.target.value.replace(/[-\s]/g, ""))}
                inputMode="numeric"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Páginas</Label>
              <Input
                value={edPaginas}
                onChange={(e) => setEdPaginas(e.target.value)}
                inputMode="numeric"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Preço (R$)</Label>
              <Input
                value={edPreco}
                onChange={(e) => setEdPreco(e.target.value)}
                inputMode="decimal"
                placeholder="49,90"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>URL da capa</Label>
            <Input
              value={edCapa}
              onChange={(e) => setEdCapa(e.target.value)}
              placeholder="https://…"
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            onClick={salvarEdicao}
            disabled={savingEdicao}
            className="rounded-xl bg-primary hover:bg-primary-hover"
          >
            {savingEdicao ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar edição"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CadastroManual;
