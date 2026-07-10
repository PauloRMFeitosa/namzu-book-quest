import { forwardRef } from "react";
import logoNamzu from "@/assets/logo-namzu.png";
import { TEMAS, CitacaoTema, CARD_W, CARD_H } from "@/components/CitacaoCard";

// Limite de caracteres exibidos no card exportado
const TEXTO_MAX = 700;

// Remove a sintaxe de markdown para exibir texto puro no card exportado
function limparMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .trim();
}

interface PostShareCardProps {
  texto: string;
  autorNome: string;
  clubeNome?: string | null;
  criadoEm: string;
  /** Imagem do post já resolvida em data URL (evita CORS na captura) */
  imagemDataUrl?: string | null;
  tema?: CitacaoTema;
}

/**
 * Card de publicação do feed em tamanho nativo de exportação (1080 × 1350 px).
 * O componente pai é responsável por escalar o contêiner para preview.
 */
export const PostShareCard = forwardRef<HTMLDivElement, PostShareCardProps>(
  ({ texto, autorNome, clubeNome, criadoEm, imagemDataUrl, tema = "papel" }, ref) => {
    const t = TEMAS[tema];

    const textoLimpo = limparMarkdown(texto);
    const textoExibido =
      textoLimpo.length > TEXTO_MAX ? `${textoLimpo.slice(0, TEXTO_MAX).trimEnd()}…` : textoLimpo;

    // Tamanho de fonte adaptativo — menor quando há imagem dividindo o espaço
    const len = textoExibido.length;
    const fontSize = imagemDataUrl
      ? len > 250 ? 30 : len > 120 ? 34 : 40
      : len > 500 ? 32 : len > 350 ? 38 : len > 200 ? 44 : len > 100 ? 50 : 56;

    const data = new Date(criadoEm).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          background: t.bg,
          color: t.text,
          fontFamily: "'Fraunces', Georgia, serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "88px 96px",
          position: "relative",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Cantoneira superior esquerda */}
        <div style={{
          position: "absolute", top: 44, left: 44,
          width: 56, height: 56,
          borderTop: `3px solid ${t.ornament}`,
          borderLeft: `3px solid ${t.ornament}`,
          opacity: 0.45,
        }} />
        {/* Cantoneira inferior direita */}
        <div style={{
          position: "absolute", bottom: 44, right: 44,
          width: 56, height: 56,
          borderBottom: `3px solid ${t.ornament}`,
          borderRight: `3px solid ${t.ornament}`,
          opacity: 0.45,
        }} />

        {/* Nome do clube no topo */}
        {clubeNome && (
          <div style={{
            position: "absolute", top: 64,
            left: 0, right: 0, textAlign: "center",
          }}>
            <span style={{
              fontSize: 22,
              letterSpacing: "0.22em",
              fontWeight: 600,
              color: t.accent,
              opacity: 0.65,
              fontFamily: "'Inter', system-ui, sans-serif",
              textTransform: "uppercase",
            }}>
              {clubeNome}
            </span>
          </div>
        )}

        {/* Área de conteúdo */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", maxWidth: 880, gap: 48,
        }}>
          {imagemDataUrl && (
            <img
              src={imagemDataUrl}
              alt=""
              style={{
                maxWidth: 760,
                maxHeight: 520,
                borderRadius: 24,
                objectFit: "cover",
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
              }}
            />
          )}

          {textoExibido && (
            <p style={{
              fontSize,
              fontWeight: 500,
              lineHeight: 1.5,
              letterSpacing: "-0.015em",
              color: t.text,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}>
              {textoExibido}
            </p>
          )}

          {/* Divisor */}
          <div style={{
            width: 72, height: 2,
            background: t.accent, opacity: 0.35,
          }} />

          {/* Autoria */}
          <div>
            <p style={{
              fontSize: 28, fontWeight: 600,
              color: t.accent, margin: "0 0 10px",
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "0.01em",
            }}>
              {autorNome}
            </p>
            <p style={{
              fontSize: 24, fontStyle: "italic",
              color: t.muted, margin: 0, fontWeight: 400,
            }}>
              {data}
            </p>
          </div>
        </div>

        {/* Rodapé: logo + endereço do site */}
        <div style={{
          position: "absolute", bottom: 44,
          left: 0, right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}>
          <img
            src={logoNamzu}
            alt=""
            style={{ width: 60, height: "auto", opacity: 0.9 }}
          />
          <span style={{
            fontSize: 22,
            letterSpacing: "0.12em",
            fontWeight: 600,
            color: t.namzu,
            opacity: 0.7,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            www.namzu.com.br
          </span>
        </div>
      </div>
    );
  }
);
PostShareCard.displayName = "PostShareCard";
