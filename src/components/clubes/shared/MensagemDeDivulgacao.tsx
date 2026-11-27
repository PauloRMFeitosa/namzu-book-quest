import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAXIMO_MENSAGEM_DE_DIVULGACAO,
  gravarMensagem,
  lerMensagem,
  textoPadraoDaMensagem,
  type TipoDeMensagem,
} from "@/lib/mensagemDeDivulgacao";

/** Texto da mensagem de divulgação, guardado neste aparelho por clube. */
export function useMensagemDeDivulgacao(tipo: TipoDeMensagem, clubeId: string, nomeClube: string) {
  const [texto, setTexto] = useState(() => lerMensagem(tipo, clubeId, nomeClube));

  useEffect(() => {
    setTexto(lerMensagem(tipo, clubeId, nomeClube));
  }, [tipo, clubeId, nomeClube]);

  const mudar = (novo: string) => {
    setTexto(novo);
    gravarMensagem(tipo, clubeId, nomeClube, novo);
  };
  const padrao = textoPadraoDaMensagem(tipo, nomeClube);
  return { texto, mudar, padrao, editado: texto !== padrao, restaurar: () => mudar(padrao) };
}

// Campo para o organizador ajustar a mensagem que vai junto do link no
// WhatsApp. Não é formulário de criação: o texto fica guardado no aparelho
// enquanto for diferente do padrão.
export const MensagemDeDivulgacao = ({
  id,
  texto,
  onMudar,
  editado,
  onRestaurar,
}: {
  id: string;
  texto: string;
  onMudar: (texto: string) => void;
  editado: boolean;
  onRestaurar: () => void;
}) => (
  <div className="grid gap-1.5">
    <Label htmlFor={id}>Mensagem que vai com o link</Label>
    <Textarea
      id={id}
      rows={3}
      maxLength={MAXIMO_MENSAGEM_DE_DIVULGACAO}
      value={texto}
      onChange={(e) => onMudar(e.target.value)}
      placeholder="Escreva o convite do seu jeito"
    />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">O link entra no fim da mensagem, no WhatsApp.</p>
      {editado && (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRestaurar}>
          Voltar ao texto padrão
        </Button>
      )}
    </div>
  </div>
);
