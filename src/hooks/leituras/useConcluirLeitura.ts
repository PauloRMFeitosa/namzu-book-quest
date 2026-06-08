import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateLeituras } from "@/lib/queryInvalidation";

export interface ConcluirLeituraInput {
  usuarioLeituraId?: string | null;
  obraId?: string | null;
  clubeId?: string | null;
  totalPaginas?: number | null;
  /** YYYY-MM-DD */
  dataFim: string;
}

/**
 * Fonte única da verdade para concluir uma leitura.
 * Usada tanto pelo botão "Concluir leitura" quanto pelo modal de
 * atualização ao atingir 100%. Toda a regra de conclusão vive aqui.
 */
export function useConcluirLeitura() {
  const qc = useQueryClient();

  return async ({ usuarioLeituraId, obraId, clubeId, totalPaginas, dataFim }: ConcluirLeituraInput) => {
    const today = new Date().toISOString().slice(0, 10);
    if (!dataFim) dataFim = today;
    if (dataFim > today) {
      toast.error("A data de conclusão não pode ser futura.");
      throw new Error("data_fim_futura");
    }

    const body: Record<string, unknown> = {
      percentual: 100,
      data_fim: dataFim,
      registrar_leitura_progresso: true,
    };
    if (usuarioLeituraId) body.usuario_leitura_id = usuarioLeituraId;
    if (obraId) body.obra_id = obraId;
    if (clubeId) body.clube_id = clubeId;
    if (totalPaginas && totalPaginas > 0) body.pagina_atual = totalPaginas;

    const { error } = await supabase.functions.invoke("salvar-progresso-leitura", { body });
    if (error) throw error;

    toast.success("Leitura concluída!");
    if (usuarioLeituraId) {
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
      qc.invalidateQueries({ queryKey: ["timeline-livro", usuarioLeituraId] });
    }
    if (clubeId) qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
    invalidateLeituras(qc);
  };
}
