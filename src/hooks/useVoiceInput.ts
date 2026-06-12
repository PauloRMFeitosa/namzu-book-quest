import { useState, useCallback, useRef } from "react";

// Verifica suporte em tempo de execução (não em SSR)
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
};

export const isSpeechSupported = !!getSpeechRecognition();

type TranscriptCallback = (text: string, isInterim: boolean) => void;

type UseVoiceInputOptions = {
  onTranscript: TranscriptCallback;
  lang?: string;
};

export const useVoiceInput = ({
  onTranscript,
  lang = "pt-BR",
}: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Garante que não há sessão anterior aberta
    recognitionRef.current?.stop();

    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false; // para no silêncio — comportamento natural no mobile
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (e: any) => {
      // "no-speech" é silêncio — não é erro real
      if (e.error !== "no-speech") setError(e.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (finalText) onTranscript(finalText, false);
      else if (interimText) onTranscript(interimText, true);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onTranscript]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, error, start, stop, toggle, isSupported: isSpeechSupported };
};
