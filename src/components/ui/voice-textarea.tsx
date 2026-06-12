import { useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceInput, isSpeechSupported } from "@/hooks/useVoiceInput";
import { cn } from "@/lib/utils";

type VoiceTextareaProps = {
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Textarea com botão de microfone integrado (Web Speech API).
 * O botão só aparece em browsers que suportam SpeechRecognition (Chrome/Edge/Android).
 * Em Safari/iOS o componente renderiza um <Textarea> normal sem alteração.
 */
export const VoiceTextarea = ({
  value,
  onValueChange,
  rows = 3,
  className,
  placeholder,
  disabled,
}: VoiceTextareaProps) => {
  const [interim, setInterim] = useState("");

  const handleTranscript = useCallback(
    (text: string, isInterim: boolean) => {
      if (isInterim) {
        setInterim(text);
        return;
      }
      // Resultado final: limpa interim e anexa ao valor existente
      setInterim("");
      const separator = value.length > 0 && !value.endsWith(" ") ? " " : "";
      onValueChange(value + separator + text);
    },
    [value, onValueChange]
  );

  const { isListening, toggle } = useVoiceInput({ onTranscript: handleTranscript });

  // Sem suporte → textarea normal
  if (!isSpeechSupported) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        rows={rows}
        className={cn("rounded-xl", className)}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => {
          setInterim("");
          onValueChange(e.target.value);
        }}
        rows={rows}
        className={cn("rounded-xl pr-10", className)}
        placeholder={placeholder}
        disabled={disabled || isListening}
      />

      {/* Preview do texto sendo reconhecido */}
      {isListening && interim && (
        <div className="absolute bottom-10 left-2 right-10 pointer-events-none">
          <p className="text-xs text-muted-foreground italic bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 line-clamp-2">
            {interim}…
          </p>
        </div>
      )}

      {/* Botão de microfone */}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={isListening ? "Parar gravação" : "Ditar texto"}
        className={cn(
          "absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all",
          isListening
            ? "bg-destructive text-destructive-foreground shadow-md animate-pulse"
            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
        )}
      >
        {isListening ? (
          <MicOff className="w-3.5 h-3.5" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
