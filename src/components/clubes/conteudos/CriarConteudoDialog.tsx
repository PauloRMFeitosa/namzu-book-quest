import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCriarConteudo } from "@/hooks/clubes/useConteudos";

const draftKey = (clubeId: string) => `draft-conteudo-${clubeId}`;

interface FormValues {
  titulo: string;
  descricao: string;
  tipo: string;
  url_conteudo: string;
  ordem_liberacao: number;
  liberado_apos_dias: number;
}

export const CriarConteudoDialog = ({
  open,
  onOpenChange,
  clubeId,
  proximaOrdem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubeId: string;
  proximaOrdem: number;
}) => {
  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<FormValues>({
    defaultValues: {
      titulo: "",
      descricao: "",
      tipo: "video",
      url_conteudo: "",
      ordem_liberacao: proximaOrdem,
      liberado_apos_dias: 0,
    },
  });
  const tipo = watch("tipo");
  const criar = useCriarConteudo(clubeId);
  const [submitting, setSubmitting] = useState(false);

  // Restaura rascunho ao abrir o dialog
  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(draftKey(clubeId));
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<FormValues>;
      reset({ titulo: "", descricao: "", tipo: "video", url_conteudo: "", ordem_liberacao: proximaOrdem, liberado_apos_dias: 0, ...draft });
    } catch {}
  }, [open, clubeId, proximaOrdem, reset]);

  // Salva rascunho automaticamente a cada alteração
  useEffect(() => {
    const sub = watch((values) => {
      localStorage.setItem(draftKey(clubeId), JSON.stringify(values));
    });
    return () => sub.unsubscribe();
  }, [watch, clubeId]);

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      await criar.mutateAsync({
        titulo: v.titulo,
        descricao: v.descricao || undefined,
        tipo: v.tipo,
        url_conteudo: v.url_conteudo,
        ordem_liberacao: Number(v.ordem_liberacao) || proximaOrdem,
        liberado_apos_dias: Number(v.liberado_apos_dias) || 0,
      });
      localStorage.removeItem(draftKey(clubeId));
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Novo conteúdo curado</DialogTitle>
          <DialogDescription>
            Material exclusivo para os membros — vídeos, PDFs, links ou textos longos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Título</Label>
            <Input {...register("titulo", { required: true })} placeholder="Ex.: Aula 1 — Introdução" />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Descrição</Label>
            <Textarea
              {...register("descricao")}
              rows={3}
              placeholder="Resumo do conteúdo, o que o membro vai aprender…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setValue("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="live_gravada">Live gravada</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="link">Link externo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Ordem</Label>
              <Input type="number" min={1} {...register("ordem_liberacao", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>URL do conteúdo</Label>
            <Input {...register("url_conteudo", { required: true })} placeholder="https://…" />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Liberar após (dias da entrada do membro)</Label>
            <Input type="number" min={0} {...register("liberado_apos_dias", { valueAsNumber: true })} />
            <p className="text-[11px] text-muted-foreground">
              0 = liberado imediatamente. Use para criar uma trilha gradual.
            </p>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formState.isValid}
              className="bg-primary hover:bg-primary-hover"
            >
              {submitting ? "Publicando…" : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
