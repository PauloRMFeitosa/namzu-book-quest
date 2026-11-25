import { useCallback, useEffect, useState } from "react";
import { lerRascunho } from "@/lib/criacao";

/**
 * Rascunho de uma página de criação, guardado no localStorage. Restaura ao
 * abrir, salva a cada alteração e some quando o formulário volta ao vazio ou
 * quando `limpar` é chamado depois de salvar com sucesso.
 */
export function useRascunho<T extends object>(chave: string, vazio: T) {
  const [dados, setDados] = useState<T>(() => lerRascunho(chave, vazio));

  useEffect(() => {
    const emBranco = JSON.stringify(dados) === JSON.stringify(vazio);
    if (emBranco) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(dados));
  }, [chave, dados, vazio]);

  const mudar = useCallback((parte: Partial<T>) => setDados((atual) => ({ ...atual, ...parte })), []);
  const limpar = useCallback(() => {
    localStorage.removeItem(chave);
    setDados(vazio);
  }, [chave, vazio]);

  return { dados, mudar, limpar };
}
