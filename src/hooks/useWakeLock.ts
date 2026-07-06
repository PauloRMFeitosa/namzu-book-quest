import { useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (tipo: "release", cb: () => void) => void;
};

const suportado =
  typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Mantém a tela do dispositivo ligada (Screen Wake Lock API) enquanto `ativo` for true.
 * O sistema libera o lock automaticamente quando o app vai para segundo plano;
 * o hook readquire ao voltar para o primeiro plano.
 */
export function useWakeLock(ativo: boolean) {
  const [ligado, setLigado] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!suportado || !ativo) return;
    let cancelado = false;

    const adquirir = async () => {
      if (cancelado || document.visibilityState !== "visible") return;
      try {
        const sentinel: WakeLockSentinelLike = await (navigator as any).wakeLock.request("screen");
        if (cancelado) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setLigado(true);
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            setLigado(false);
          }
        });
      } catch {
        // negado pelo sistema (ex.: economia de bateria) — segue sem manter a tela
        setLigado(false);
      }
    };

    adquirir();
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") adquirir();
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setLigado(false);
    };
  }, [ativo]);

  return { suportado, ligado };
}
