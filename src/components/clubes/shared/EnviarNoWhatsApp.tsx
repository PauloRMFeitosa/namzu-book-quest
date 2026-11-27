import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { linkParaEnviarNoWhatsApp } from "@/lib/grupoDoClube";
import { cn } from "@/lib/utils";

// Abre o WhatsApp com a mensagem pronta, para o organizador escolher o grupo
// do clube. Fica ao lado dos botões "Copiar ... para o grupo".
export const EnviarNoWhatsApp = ({
  texto,
  aoEnviar,
  rotulo = "Enviar no WhatsApp",
  variant = "ghost",
  className,
}: {
  texto: string;
  aoEnviar?: () => void;
  rotulo?: string;
  variant?: ButtonProps["variant"];
  className?: string;
}) => (
  <Button asChild size="sm" variant={variant} className={cn("h-8", className)}>
    <a href={linkParaEnviarNoWhatsApp(texto)} target="_blank" rel="noopener noreferrer" onClick={aoEnviar}>
      <MessageCircle className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {rotulo}
    </a>
  </Button>
);
