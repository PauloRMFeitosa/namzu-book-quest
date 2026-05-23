import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (isbn: string) => void;
}

export const BarcodeScannerDialog = ({ open, onOpenChange, onDetected }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]);
    const reader = new BrowserMultiFormatReader(hints);

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|traseira|rear|environment/i.test(d.label)) ?? devices[devices.length - 1];
        const deviceId = back?.deviceId;

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, _err, ctrl) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText().replace(/[^\d]/g, "");
              if (text.length === 13 || text.length === 10) {
                ctrl.stop();
                onDetected(text);
                onOpenChange(false);
              }
            }
          }
        );
        controlsRef.current = controls;
        if (!cancelled) setStarting(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Não foi possível acessar a câmera");
          setStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch {}
      controlsRef.current = null;
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ler código de barras (ISBN)</DialogTitle>
          <DialogDescription>Aponte a câmera para o código de barras na contracapa do livro.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {!starting && !error && (
            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 h-24 border-2 border-primary/80 rounded-md" />
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
