import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CapaUploader } from "@/components/clubes/shared/CapaUploader";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CriarClubeDialog = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    objetivo: "",
    categoria: "",
    visibilidade: "publico",
    imagem_capa_url: "",
  });

  const submit = async () => {
    if (!user) {
      toast.error("Faça login para criar um clube");
      return;
    }
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("clubes")
        .insert({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          objetivo: form.objetivo.trim() || null,
          categoria: form.categoria || null,
          visibilidade: form.visibilidade,
          imagem_capa_url: form.imagem_capa_url.trim() || null,
          curador_id: user.id,
          is_ativo: true,
          duracao_tipo: "continuo",
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Curador entra automaticamente como membro ativo
      await supabase
        .from("clube_membros")
        .insert({
          clube_id: data.id,
          user_id: user.id,
          status: "ativo",
          papel: "moderador",
        } as any);

      toast.success("Clube criado!");
      qc.invalidateQueries({ queryKey: ["clubes-marketplace"] });
      setOpen(false);
      navigate(`/clubes/${data.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar clube");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-2xl bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Criar clube
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar seu clube de leitura</DialogTitle>
          <DialogDescription>
            Reúna leitores ao redor de uma ideia, autor ou estilo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Clube de Filosofia Estoica"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Imagem de capa</Label>
            <CapaUploader
              value={form.imagem_capa_url}
              onChange={(v) => setForm((f) => ({ ...f, imagem_capa_url: v }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Sobre o que é este clube?"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Categoria</Label>
            <Select
              value={form.categoria || "_none"}
              onValueChange={(v) => setForm((f) => ({ ...f, categoria: v === "_none" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem categoria</SelectItem>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Visibilidade</Label>
            <Select
              value={form.visibilidade}
              onValueChange={(v) => setForm((f) => ({ ...f, visibilidade: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publico">Público — qualquer pessoa pode entrar</SelectItem>
                <SelectItem value="privado">Privado — só por link, com pedido de entrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Objetivo (opcional)</Label>
            <Textarea
              rows={2}
              value={form.objetivo}
              onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
              placeholder="O que vocês querem alcançar juntos?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !form.nome.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar clube"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
