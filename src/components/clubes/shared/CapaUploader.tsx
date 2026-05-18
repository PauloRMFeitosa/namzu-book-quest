import { useRef, useState } from "react";
import { Loader2, ImagePlus, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxSize = 1400;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível preparar a imagem"));
        return;
      }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar esta imagem"));
    };
    img.src = objectUrl;
  });

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export const CapaUploader = ({ value, onChange }: Props) => {
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!isImage) return toast.error("Selecione uma imagem válida");
    if (file.size > 25 * 1024 * 1024) return toast.error("Imagem máxima de 25MB");
    setUploading(true);
    try {
      const source = isHeic(file) ? await convertHeicToJpegFile(file) : file;
      onChange(await fileToDataUrl(source));
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível processar esta foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div className="relative w-full max-w-sm">
          <img src={value} alt="Capa" className="w-full rounded-lg border border-border/40 aspect-[16/10] object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow"
            aria-label="Remover capa"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => galleryRef.current?.click()} className="gap-1.5">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          Galeria
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => cameraRef.current?.click()} className="gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          Câmera
        </Button>
      </div>
    </div>
  );
};
