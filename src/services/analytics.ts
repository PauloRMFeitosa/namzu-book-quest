import { supabase } from "@/integrations/supabase/client";

// Eventos de produto (Fase 2 do roadmap). Gravados na tabela
// `eventos_produto`, que só aceita escrita do próprio usuário logado e só é
// lida por admins. A lista, as propriedades e as consultas de acompanhamento
// estão em docs/metricas-produto.md.

export type EventoProduto =
  | "clube_criado"
  | "convite_gerado"
  | "membro_entrou"
  | "progresso_registrado"
  | "encontro_criado"
  | "rsvp_respondido"
  | "roteiro_ia_gerado"
  | "membros_exportados"
  | "cronograma_definido"
  | "mensagem_meta_copiada"
  | "lembrete_encontro_copiado"
  | "presenca_registrada"
  | "ata_salva"
  | "votacao_data_aberta"
  | "voto_data_registrado"
  | "votacao_data_encerrada"
  | "aviso_enviado"
  | "aviso_copiado"
  | "pagina_publica_definida"
  | "pagina_publica_compartilhada"
  | "roteiro_dispensado"
  | "grupo_do_clube_definido"
  | "grupo_do_clube_aberto"
  | "imagem_compartilhada";

type ValorProp = string | number | boolean | null;

export interface DadosEvento {
  clubeId?: string | null;
  props?: Record<string, ValorProp | undefined>;
}

const MAX_CHAVES = 12;
const MAX_TEXTO = 120;

/**
 * Deixa as propriedades em um formato seguro para gravar: sem `undefined`,
 * sem objetos aninhados, com textos e quantidade de chaves limitados. Evento
 * de produto não é lugar para texto livre do usuário.
 */
export function prepararProps(props: DadosEvento["props"]): Record<string, ValorProp> {
  const saida: Record<string, ValorProp> = {};
  if (!props) return saida;
  for (const [chave, valor] of Object.entries(props)) {
    if (Object.keys(saida).length >= MAX_CHAVES) break;
    if (valor === undefined) continue;
    if (valor === null || typeof valor === "boolean") {
      saida[chave] = valor;
    } else if (typeof valor === "number") {
      if (Number.isFinite(valor)) saida[chave] = valor;
    } else if (typeof valor === "string") {
      saida[chave] = valor.slice(0, MAX_TEXTO);
    }
  }
  return saida;
}

/**
 * Registra um evento de produto. Não devolve nada e nunca lança erro: medir o
 * uso não pode atrapalhar quem está usando. Sem sessão, não grava.
 */
export function registrarEvento(evento: EventoProduto, dados: DadosEvento = {}): void {
  const props = prepararProps(dados.props);
  if (import.meta.env.DEV) {
    console.info("[analytics]", evento, { clubeId: dados.clubeId ?? null, ...props });
  }
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { error } = await supabase
        .from("eventos_produto")
        .insert({ evento, clube_id: dados.clubeId ?? null, props });
      if (error && import.meta.env.DEV) console.warn("[analytics] não gravou:", error.message);
    } catch {
      // silencioso de propósito
    }
  })();
}
