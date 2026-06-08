import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

/**
 * Editor de capa com proporção 16:10 (mesma do card).
 * Permite arrastar, dar zoom e gera o JPEG final já recortado.
 */

export const CAPA_ASPECT_W = 16;
export const CAPA_ASPECT_H = 10;
export const CAPA_OUTPUT_W = 1600;
export const CAPA_OUTPUT_H = 1000;

interface Props {
  /** Imagem fonte (data URL ou http URL CORS-friendly) */
  src: string;
  /** Callback com a imagem cropada (data URL JPEG) */
  onCropped: (dataUrl: string) => void;
}

interface ImgState {
  natW: number;
  natH: number;
  /** Escala mínima necessária para cobrir a área (cover) */
  baseScale: number;
}

export const CapaEditor = ({ src, onCropped }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [img, setImg] = useState<ImgState | null>(null);
  const [zoom, setZoom] = useState(1); // multiplicador sobre baseScale
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const boxH = boxW * (CAPA_ASPECT_H / CAPA_ASPECT_W);

  // Observa largura disponível
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Carrega imagem e calcula baseScale
  useEffect(() => {
    if (!src || !boxW) return;
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      const scaleW = boxW / i.naturalWidth;
      const scaleH = boxH / i.naturalHeight;
      const baseScale = Math.max(scaleW, scaleH);
      setImg({ natW: i.naturalWidth, natH: i.naturalHeight, baseScale });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    i.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, boxW]);

  const clampOffset = useCallback(
    (x: number, y: number) => {
      if (!img) return { x: 0, y: 0 };
      const displayedW = img.natW * img.baseScale * zoom;
      const displayedH = img.natH * img.baseScale * zoom;
      const maxX = Math.max(0, (displayedW - boxW) / 2);
      const maxY = Math.max(0, (displayedH - boxH) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [img, zoom, boxW, boxH]
  );

  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y));
  }, [zoom, clampOffset]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clampOffset(drag.current.ox + dx, drag.current.oy + dy));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(4, Math.max(1, zoom + (e.deltaY < 0 ? 0.08 : -0.08)));
    setZoom(next);
  };

  // Gera o JPEG final
  const buildCrop = useCallback((): string | null => {
    if (!img || !boxW) return null;
    const canvas = document.createElement("canvas");
    canvas.width = CAPA_OUTPUT_W;
    canvas.height = CAPA_OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Mapeamento: o preview tem boxW x boxH; a imagem está em displayedW/H com offset.
    // Crop em coords da imagem original:
    const effScale = img.baseScale * zoom;
    const cropW = boxW / effScale;
    const cropH = boxH / effScale;
    const centerX = img.natW / 2 - offset.x / effScale;
    const centerY = img.natH / 2 - offset.y / effScale;
    const sx = centerX - cropW / 2;
    const sy = centerY - cropH / 2;

    const sourceImg = imgRef.current;
    if (!sourceImg) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceImg, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [img, boxW, boxH, zoom, offset]);

  // Atualiza preview em tempo real
  const [preview, setPreview] = useState<string>("");
  useEffect(() => {
    if (!img) return;
    const id = requestAnimationFrame(() => {
      const dataUrl = buildCrop();
      if (dataUrl) {
        setPreview(dataUrl);
        onCropped(dataUrl);
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, zoom, offset, boxW]);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Área de edição */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden bg-secondary border border-border/60 select-none touch-none"
        style={{ aspectRatio: `${CAPA_ASPECT_W} / ${CAPA_ASPECT_H}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {img && boxW > 0 && (
          <img
            ref={imgRef}
            src={src}
            alt=""
            crossOrigin="anonymous"
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: img.natW * img.baseScale * zoom,
              height: img.natH * img.baseScale * zoom,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              cursor: drag.current ? "grabbing" : "grab",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Overlay com guias */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-primary/40" />
          <div className="absolute top-1/3 left-0 right-0 border-t border-primary/20" />
          <div className="absolute top-2/3 left-0 right-0 border-t border-primary/20" />
          <div className="absolute left-1/3 top-0 bottom-0 border-l border-primary/20" />
          <div className="absolute left-2/3 top-0 bottom-0 border-l border-primary/20" />
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <Slider value={[zoom]} min={1} max={4} step={0.01} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <Button type="button" size="icon" variant="outline" onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button type="button" size="icon" variant="outline" onClick={reset} title="Centralizar">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={reset} title="Resetar">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Previews */}
      {preview && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Card</span>
            <div className="rounded-lg overflow-hidden border border-border/60 bg-gradient-warm" style={{ aspectRatio: "16 / 10" }}>
              <img src={preview} alt="Preview card" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Página do clube</span>
            <div className="rounded-lg overflow-hidden border border-border/60 bg-gradient-warm relative" style={{ aspectRatio: "16 / 6" }}>
              <img src={preview} alt="Preview header" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
