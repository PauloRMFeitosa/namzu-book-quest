import { useEffect, useState } from "react";
import { Copy, Download, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MensagemDeDivulgacao, useMensagemDeDivulgacao } from "@/components/clubes/shared/MensagemDeDivulgacao";
import { linkConvite } from "@/lib/convite";
import { montarMensagem } from "@/lib/mensagemDeDivulgacao";
import { caminhoDaPagina } from "@/lib/enderecoClube";
import { gravarMarca } from "@/lib/primeirosPassos";
import { registrarEvento } from "@/services/analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubeId: string;
  nomeClube: string;
  privado?: boolean;
  /** Abre logo depois de criar o clube, com o texto de boas-vindas. */
  recemCriado?: boolean;
  /** Endereço da página pública, quando ela está no ar. */
  enderecoDaPagina?: string | null;
}

export const ConvidarMembrosDialog = ({
  open,
  onOpenChange,
  clubeId,
  nomeClube,
  privado,
  recemCriado,
  enderecoDaPagina,
}: Props) => {
  // Além do evento de produto, marca o passo "Convide os membros" do roteiro.
  const registrarConvite = (canal: string) => {
    registrarEvento("convite_gerado", { clubeId, props: { canal } });
    gravarMarca(clubeId, "convite");
  };
  const link = linkConvite(clubeId);
  const texto = useMensagemDeDivulgacao("convite", clubeId, nomeClube);
  const mensagem = montarMensagem(texto.texto, link);
  const podeCompartilhar = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // QR code do link, para projetar no encontro ou imprimir. A biblioteca só é
  // baixada quando o diálogo abre.
  const [qrCode, setQrCode] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(link, { width: 480, margin: 2, errorCorrectionLevel: "M" }))
      .then((dataUrl) => {
        if (!cancelado) setQrCode(dataUrl);
      })
      .catch(() => {
        if (!cancelado) setQrCode(null);
      });
    return () => {
      cancelado = true;
    };
  }, [open, link]);

  const baixarQrCode = () => {
    if (!qrCode) return;
    const a = document.createElement("a");
    a.href = qrCode;
    a.download = `convite-${clubeId.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    registrarConvite("qrcode");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
      registrarConvite("copiar");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  const compartilhar = async () => {
    try {
      await navigator.share({ title: nomeClube, text: texto.texto.trim() || undefined, url: link });
      registrarConvite("compartilhar");
    } catch {
      /* usuário fechou a folha de compartilhamento */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{recemCriado ? "Clube criado! Convide seus membros" : "Convidar membros"}</DialogTitle>
          <DialogDescription>
            Envie este link. Quem abrir vê o clube e entra com um cadastro rápido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={link}
              aria-label="Link de convite"
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 rounded-xl text-xs"
            />
            <Button onClick={copiar} className="h-11 rounded-xl gap-1.5 bg-primary hover:bg-primary-hover shrink-0">
              <Copy className="w-4 h-4" /> Copiar
            </Button>
          </div>

          <MensagemDeDivulgacao
            id="convite-mensagem"
            texto={texto.texto}
            onMudar={texto.mudar}
            editado={texto.editado}
            onRestaurar={texto.restaurar}
          />

          <Button asChild variant="outline" className="h-11 rounded-xl gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrarConvite("whatsapp")}
            >
              <MessageCircle className="w-4 h-4" /> Enviar pelo WhatsApp
            </a>
          </Button>

          {podeCompartilhar && (
            <Button variant="outline" onClick={compartilhar} className="h-11 rounded-xl gap-2">
              <Share2 className="w-4 h-4" /> Outras formas de compartilhar
            </Button>
          )}

          {qrCode && (
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
              <img
                src={qrCode}
                alt={`QR code do convite para ${nomeClube}`}
                className="w-24 h-24 rounded-lg bg-white shrink-0"
              />
              <div className="flex flex-col gap-2 min-w-0">
                <p className="text-xs text-muted-foreground leading-snug">
                  Mostre no encontro ou imprima. Quem apontar a câmera cai no convite.
                </p>
                <Button variant="outline" size="sm" onClick={baixarQrCode} className="rounded-xl gap-1.5 self-start">
                  <Download className="w-3.5 h-3.5" /> Baixar QR code
                </Button>
              </div>
            </div>
          )}

          {enderecoDaPagina && (
            <p className="text-xs text-muted-foreground">
              O convite é para quem você já conhece. Para divulgar a quem ainda não conhece o clube, use a{" "}
              <a
                href={caminhoDaPagina(enderecoDaPagina)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                página pública
              </a>
              .
            </p>
          )}

          {privado && (
            <p className="text-xs text-muted-foreground">
              Este clube é privado: quem entrar pelo link fica aguardando a sua aprovação na aba Membros.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
