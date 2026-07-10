import { forwardRef } from "react";
import logoNamzu from "@/assets/logo-namzu.png";
import type { Citacao } from "@/hooks/useCitacoes";

export type CitacaoTema = "papel" | "mint" | "ink";

// Fixed pixel values — used for PNG export at 1080×1350
export const TEMAS: Record<CitacaoTema, {
  bg: string; text: string; accent: string;
  muted: string; ornament: string; namzu: string;
}> = {
  papel: {
    bg: "#F7F3EC",
    text: "#1C2B4A",
    accent: "#7A5C3A",
    muted: "#6B5A3E",
    ornament: "#C4A882",
    namzu: "#8B6F47",
  },
  mint: {
    bg: "#D1F2E5",
    text: "#12263F",
    accent: "#1A3B8B",
    muted: "#2A5298",
    ornament: "#1A3B8B",
    namzu: "#1A3B8B",
  },
  ink: {
    bg: "#12263F",
    text: "#F7F9F7",
    accent: "#88B4D8",
    muted: "#A8C8E8",
    ornament: "#88B4D8",
    namzu: "#88B4D8",
  },
};

export const CARD_W = 1080;
export const CARD_H = 1350;

interface CitacaoCardProps {
  citacao: Citacao;
  tema?: CitacaoTema;
}

/**
 * Renders at native export size (1080 × 1350 px).
 * Parent is responsible for scaling the container for preview.
 */
export const CitacaoCard = forwardRef<HTMLDivElement, CitacaoCardProps>(
  ({ citacao, tema = "papel" }, ref) => {
    const t = TEMAS[tema];

    // Adaptive font size based on text length
    const len = citacao.texto.length;
    const fontSize = len > 350 ? 34 : len > 200 ? 42 : len > 100 ? 50 : 58;

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
        {/* Top-left corner bracket */}
        <div style={{
          position: "absolute", top: 44, left: 44,
          width: 56, height: 56,
          borderTop: `3px solid ${t.ornament}`,
          borderLeft: `3px solid ${t.ornament}`,
          opacity: 0.45,
        }} />
        {/* Bottom-right corner bracket */}
        <div style={{
          position: "absolute", bottom: 44, right: 44,
          width: 56, height: 56,
          borderBottom: `3px solid ${t.ornament}`,
          borderRight: `3px solid ${t.ornament}`,
          opacity: 0.45,
        }} />

        {/* Content area */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", maxWidth: 880,
        }}>
          {/* Opening quote mark */}
          <div style={{
            fontSize: 160, lineHeight: 0.8,
            color: t.accent, opacity: 0.18,
            fontStyle: "italic",
            marginBottom: 24,
            userSelect: "none",
          }}>
            "
          </div>

          {/* Citation text */}
          <p style={{
            fontSize,
            fontStyle: "italic",
            fontWeight: 500,
            lineHeight: 1.5,
            letterSpacing: "-0.015em",
            color: t.text,
            margin: "0 0 56px",
          }}>
            {citacao.texto}
          </p>

          {/* Divider */}
          <div style={{
            width: 72, height: 2,
            background: t.accent, opacity: 0.35,
            margin: "0 auto 40px",
          }} />

          {/* Attribution */}
          <div>
            {citacao.autor_nome && (
              <p style={{
                fontSize: 28, fontWeight: 600,
                color: t.accent, margin: "0 0 10px",
                fontStyle: "normal",
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: "0.01em",
              }}>
                {citacao.autor_nome}
              </p>
            )}
            <p style={{
              fontSize: 24, fontStyle: "italic",
              color: t.muted, margin: 0, fontWeight: 400,
            }}>
              {citacao.obra_titulo}
              {citacao.pagina ? ` · p. ${citacao.pagina}` : ""}
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
CitacaoCard.displayName = "CitacaoCard";
