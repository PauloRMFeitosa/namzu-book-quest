import { useRef, useState, type ReactNode, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EnviarNoWhatsApp } from "@/components/clubes/shared/EnviarNoWhatsApp";
import { FORMATOS, type FormatoDaImagem } from "@/lib/imagemDeDivulgacao";
import { MAXIMO_MENSAGEM_DE_DIVULGACAO, montarMensagem } from "@/lib/mensagemDeDivulgacao";
import { registrarEvento } from "@/services/analytics";
import { cn } from "@/lib/utils";

const LARGURA_NA_TELA = 270;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  clubeId: string;
  /** O que está sendo compartilhado, para o evento de produto. */
  tipo: "encontro" | "trilha";
  arquivo: string;
  /** Texto inicial da mensagem que vai com a imagem. O link entra no fim. */
  textoInicial: string;
  link: string;
  /** Desenha o cartão em tamanho real, no formato pedido. */
  cartao: (formato: FormatoDaImagem, ref: RefObject<HTMLDivElement>) => ReactNode;
  /** Ainda carregando o que a imagem precisa (capa do livro, por exemplo). */
  preparando?: boolean;
}

// Janela para compartilhar uma imagem de divulgação: escolhe o formato,
// ajusta a mensagem e manda pelo celular, baixa a imagem ou envia o texto no
// WhatsApp. É uma ação rápida, não um formulário de criação.
export const CompartilharImagem = ({ open, onOpenChange, titulo, clubeId, tipo, arquivo, textoInicial, link, cartao, preparando }: Props) => {
  const [formato, setFormato] = useState<FormatoDaImagem>("feed");
  const [texto, setTexto] = useState(textoInicial);
  const [gerando, setGerando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { largura, altura } = FORMATOS[formato];
  const escala = LARGURA_NA_TELA / largura;
  const mensagem = montarMensagem(texto, link);
  const podeCompartilhar = typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";

  const gerar = async () => {
    if (!ref.current) throw new Error("sem cartão");
    const dataUrl = await toPng(ref.current, { width: largura, height: altura, pixelRatio: 1, fetchRequestInit: { cache: "force-cache" } });
    const blob = await (await fetch(dataUrl)).blob();
    return { dataUrl, file: new File([blob], arquivo, { type: "image/png" }) };
  };

  const baixar = async () => {
    setGerando(true);
    try {
      const { dataUrl } = await gerar();
      const a = document.createElement("a");
      a.download = arquivo;
      a.href = dataUrl;
      a.click();
      toast.success("Imagem salva. Anexe no grupo ou publique nos stories.");
      registrarEvento("imagem_compartilhada", { clubeId, props: { tipo, formato, canal: "baixar" } });
    } catch {
      toast.error("Não foi possível gerar a imagem. Tente de novo.");
    } finally {
      setGerando(false);
    }
  };

  const compartilhar = async () => {
    setGerando(true);
    try {
      const { file } = await gerar();
      if (!navigator.canShare({ files: [file] })) {
        await baixar();
        return;
      }
      await navigator.share({ files: [file], text: mensagem, title: titulo });
      registrarEvento("imagem_compartilhada", { clubeId, props: { tipo, formato, canal: "compartilhar" } });
    } catch (erro) {
      // Fechar a tela de compartilhar do aparelho não é erro.
      if ((erro as { name?: string })?.name !== "AbortError") toast.error("Não foi possível compartilhar. Baixe a imagem e envie à mão.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Uma imagem pronta para o grupo do clube, os stories ou o feed.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="inline-flex self-center rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Formato da imagem">
            {(Object.keys(FORMATOS) as FormatoDaImagem[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={formato === f}
                onClick={() => setFormato(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  formato === f ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {FORMATOS[f].rotulo}
              </button>
            ))}
          </div>

          <div
            className="self-center rounded-xl overflow-hidden shadow-elevated bg-muted"
            style={{ width: LARGURA_NA_TELA, height: Math.round(altura * escala) }}
            aria-label="Prévia da imagem"
          >
            {preparando ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div style={{ width: largura, height: altura, transform: `scale(${escala})`, transformOrigin: "top left" }}>
                {cartao(formato, ref)}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="imagem-mensagem">Mensagem que vai junto</Label>
            <Textarea
              id="imagem-mensagem"
              rows={3}
              maxLength={MAXIMO_MENSAGEM_DE_DIVULGACAO}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <p className="text-xs text-muted-foreground break-all">O link entra no fim: {link.replace(/^https?:\/\//, "")}</p>
          </div>

          <div className="flex flex-col gap-2">
            {podeCompartilhar && (
              <Button onClick={compartilhar} disabled={gerando || preparando} className="h-11 rounded-xl gap-2">
                {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Compartilhar imagem e mensagem
              </Button>
            )}
            <Button
              onClick={baixar}
              disabled={gerando || preparando}
              variant={podeCompartilhar ? "outline" : "default"}
              className="h-11 rounded-xl gap-2"
            >
              {gerando && !podeCompartilhar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Baixar a imagem
            </Button>
            <EnviarNoWhatsApp
              variant="outline"
              className="h-11 rounded-xl"
              rotulo="Enviar só a mensagem no WhatsApp"
              texto={mensagem}
              aoEnviar={() => registrarEvento("imagem_compartilhada", { clubeId, props: { tipo, formato, canal: "whatsapp_texto" } })}
            />
          </div>
          {!podeCompartilhar && (
            <p className="text-xs text-muted-foreground">
              No computador, baixe a imagem e anexe na conversa. No celular, o botão de compartilhar manda a imagem e a
              mensagem juntas.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
