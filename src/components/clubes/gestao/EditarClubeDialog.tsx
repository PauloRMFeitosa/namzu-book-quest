import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAtualizarClube } from "@/hooks/clubes/useClubeGestao";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import type { ClubeDetalhe } from "@/hooks/clubes/useClube";
import { CapaUploader } from "@/components/clubes/shared/CapaUploader";

export const EditarClubeDialog = ({
  clube,
  open,
  onOpenChange,
}: {
  clube: ClubeDetalhe;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const atualizar = useAtualizarClube(clube.id);
  const [form, setForm] = useState({
    nome: clube.nome,
    descricao: clube.descricao ?? "",
    objetivo: clube.objetivo ?? "",
    regras: clube.regras ?? "",
    imagem_capa_url: clube.imagem_capa_url ?? "",
    is_ativo: clube.is_ativo,
    categoria: clube.categoria ?? "",
    visibilidade: clube.visibilidade ?? "publico",
  });

  const submit = async () => {
    await atualizar.mutateAsync({
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      objetivo: form.objetivo.trim() || null,
      regras: form.regras.trim() || null,
      imagem_capa_url: form.imagem_capa_url.trim() || null,
      is_ativo: form.is_ativo,
      categoria: form.categoria || null,
      visibilidade: form.visibilidade,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar clube</DialogTitle>
          <DialogDescription>Ajuste a identidade e os princípios da tribo.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
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
            <p className="text-xs text-muted-foreground">
              Clubes privados não aparecem no marketplace. Compartilhe o link para que peçam para entrar.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>Objetivo</Label>
            <Textarea
              rows={2}
              value={form.objetivo}
              onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Regras</Label>
            <Textarea
              rows={3}
              value={form.regras}
              onChange={(e) => setForm((f) => ({ ...f, regras: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Clube ativo</p>
              <p className="text-xs text-muted-foreground">Quando desativado, novos membros não conseguem entrar.</p>
            </div>
            <Switch
              checked={form.is_ativo}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_ativo: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={atualizar.isPending || !form.nome.trim()}>
            {atualizar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
