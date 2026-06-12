import { useRef, useState } from "react";
import { Loader2, ImagePlus, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CapaEditor } from "./CapaEditor";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;
const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

const isHeic = (file: File) =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

const convertHeicToJpegFile = async (file: File): Promise<File> => {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    r.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;]+);/.exec(meta)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export const CapaUploader = ({ value, onChange }: Props) => {
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [source, setSource] = useState<string>("");
  const [cropped, setCropped] = useState<string>("");
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const validType = ACCEPTED.test(file.type) || ACCEPTED_EXT.test(file.name);
    if (!validType) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Imagem muito grande (máximo 10MB).");
      return;
    }
    setLoading(true);
    try {
      const prepared = isHeic(file) ? await convertHeicToJpegFile(file) : file;
      const dataUrl = await fileToDataUrl(prepared);
      // valida dimensão mínima
      await new Promise<void>((resolve, reject) => {
        const i = new Image();
        i.onload = () => {
          if (i.naturalWidth < 320 || i.naturalHeight < 200) {
            reject(new Error("Imagem muito pequena. Use ao menos 320×200px."));
          } else resolve();
        };
        i.onerror = () => reject(new Error("Não foi possível ler esta imagem"));
        i.src = dataUrl;
      });
      setSource(dataUrl);
      setCropped("");
      setEditorOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível processar esta foto");
    } finally {
      setLoading(false);
    }
  };

  const editarAtual = () => {
    if (!value) return;
    setSource(value);
    setCropped("");
    setEditorOpen(true);
  };

  const salvarCapa = async () => {
    if (!cropped) {
      toast.error("Ajuste a capa antes de salvar.");
      return;
    }
    setLoading(true);
    try {
      const blob = dataUrlToBlob(cropped);
      const path = `clubes-capas/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("Geral").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upErr) {
        // fallback: salva como data URL (mantém compatibilidade)
        console.warn("[CapaUploader] upload falhou, usando data URL:", upErr.message);
        onChange(cropped);
      } else {
        const { data } = supabase.storage.from("Geral").getPublicUrl(path);
        onChange(data.publicUrl);
      }
      setEditorOpen(false);
      toast.success("Capa salva");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar a capa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div className="relative w-full max-w-sm">
          <img
            src={value}
            alt="Capa do clube"
            className="w-full rounded-lg border border-border/40 object-cover"
            style={{ aspectRatio: "16 / 10" }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow"
            aria-label="Remover capa"
          >
            <X className="w-3 h-3" />
          </button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={editarAtual}
            className="absolute bottom-2 right-2 gap-1 h-7"
          >
            <Pencil className="w-3 h-3" /> Reajustar
          </Button>
        </div>
      )}

      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => galleryRef.current?.click()}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {value ? "Trocar imagem" : "Escolher imagem"}
        </Button>
        <span className="text-[11px] text-muted-foreground">JPG, PNG ou WEBP · até 10MB</span>
      </div>

      <Dialog open={editorOpen} onOpenChange={(o) => !loading && setEditorOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capa do clube</DialogTitle>
          </DialogHeader>
          {source && <CapaEditor src={source} onCropped={setCropped} />}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvarCapa} disabled={loading || !cropped}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Salvar capa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
