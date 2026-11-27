import { useCallback, useEffect, useState } from "react";
import { gravarMarca, lerMarca, type MarcaDoRoteiro } from "@/lib/primeirosPassos";

const ler = (clubeId: string) => ({
  dispensado: lerMarca(clubeId, "dispensado"),
  convite: lerMarca(clubeId, "convite"),
  pagina: lerMarca(clubeId, "pagina"),
});

/** Marcas do roteiro guardadas no aparelho, atualizadas quando qualquer tela grava uma. */
export function useMarcasDoRoteiro(clubeId: string) {
  const [marcas, setMarcas] = useState(() => ler(clubeId));

  useEffect(() => {
    const atualizar = () => setMarcas(ler(clubeId));
    atualizar();
    window.addEventListener("namzu-roteiro", atualizar);
    return () => window.removeEventListener("namzu-roteiro", atualizar);
  }, [clubeId]);

  const marcar = useCallback((marca: MarcaDoRoteiro, valor = true) => gravarMarca(clubeId, marca, valor), [clubeId]);
  return { marcas, marcar };
}
