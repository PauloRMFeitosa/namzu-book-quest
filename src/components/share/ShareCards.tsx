import React from "react";
import logoNamzu from "@/assets/logo-namzu.png";

export type ShareFormat = "story" | "square" | "whatsapp";
export type ShareStyle = "light" | "dark" | "gradient" | "cover";
export type ShareTemplate = "recommend" | "reading" | "completed";

export const FORMAT_SIZES: Record<ShareFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Quadrado" },
  story: { w: 1080, h: 1920, label: "Story Instagram" },
  whatsapp: { w: 1080, h: 1920, label: "Story WhatsApp" },
};

export interface ShareData {
  titulo: string;
  autor?: string;
  capaUrl?: string | null;
  comentario?: string;
  nota?: number | null;
  percentual?: number | null;
  paginasLidas?: number | null;
  totalPaginas?: number | null;
  dataConclusao?: string | null;
  link: string;
  coverColors?: string[];
}

const Stars = ({ value, size }: { value: number; size: number }) => (
  <div style={{ display: "flex", gap: size * 0.1 }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const filled = i < Math.round(value);
      return (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#F5B400" : "none"} stroke={filled ? "#F5B400" : "#999"} strokeWidth={1.5}>
          <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
        </svg>
      );
    })}
  </div>
);

const palettes: Record<ShareStyle, { bg: string; fg: string; sub: string; accent: string }> = {
  light: { bg: "linear-gradient(160deg, #F7F9F7 0%, #EAEFEA 100%)", fg: "#12263F", sub: "#536479", accent: "#1A3B8B" },
  dark: { bg: "linear-gradient(160deg, #0F1B2D 0%, #142D6B 100%)", fg: "#F5F8FA", sub: "#A8B5C8", accent: "#88B4D8" },
  gradient: { bg: "linear-gradient(135deg, #1A3B8B 0%, #88B4D8 50%, #D1F2E5 100%)", fg: "#0F1B2D", sub: "#1A3B8B", accent: "#12263F" },
  cover: { bg: "linear-gradient(160deg, #2A3148 0%, #1A1F2E 100%)", fg: "#F5F8FA", sub: "#B8C0D0", accent: "#E8B547" },
};

interface CardProps {
  data: ShareData;
  template: ShareTemplate;
  format: ShareFormat;
  style: ShareStyle;
}

const TEMPLATE_LABEL: Record<ShareTemplate, { tag: string; icon: string }> = {
  recommend: { tag: "Recomendo", icon: "📚" },
  reading: { tag: "Estou lendo", icon: "📖" },
  completed: { tag: "Concluí a leitura", icon: "✅" },
};

export const ShareCard = React.forwardRef<HTMLDivElement, CardProps>(({ data, template, format, style }, ref) => {
  const { w, h } = FORMAT_SIZES[format];
  const pal = palettes[style];
  const u = Math.min(w, h);
  const isSquare = w === h;
  const meta = TEMPLATE_LABEL[template];

  // Áreas reservadas (topo/rodapé) para branding — conteúdo nunca invade
  const topReserved = u * 0.14;
  const bottomReserved = u * 0.10;

  const capaW = isSquare ? u * 0.36 : u * 0.50;
  const capaH = capaW * 1.5;

  // Área fixa de comentário (não empurra layout)
  const commentMaxH = u * 0.18;

  return (
    <div
      ref={ref}
      style={{
        width: w,
        height: h,
        position: "relative",
        background: pal.bg,
        color: pal.fg,
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Branding topo */}
      <div style={{ position: "absolute", top: u * 0.04, left: u * 0.05, display: "flex", alignItems: "center", gap: u * 0.012, zIndex: 2 }}>
        <img src={logoNamzu} style={{ width: u * 0.07, height: u * 0.07, objectFit: "contain" }} />
        <span style={{ fontFamily: "'Fraunces', serif", color: pal.fg, fontSize: u * 0.035, fontWeight: 700, letterSpacing: "0.02em" }}>Namzu</span>
      </div>

      {/* Branding rodapé */}
      <div style={{ position: "absolute", bottom: u * 0.035, right: u * 0.05, display: "flex", alignItems: "center", gap: u * 0.01, zIndex: 2 }}>
        <img src={logoNamzu} style={{ width: u * 0.032, height: u * 0.032, objectFit: "contain", opacity: 0.8 }} />
        <span style={{ color: pal.sub, fontSize: u * 0.018, fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: "0.05em" }}>www.namzu.com.br</span>
      </div>

      {/* Conteúdo */}
      <div
        style={{
          position: "absolute",
          top: topReserved,
          left: 0,
          right: 0,
          bottom: bottomReserved,
          display: "flex",
          flexDirection: isSquare ? "row" : "column",
          alignItems: "center",
          justifyContent: isSquare ? "center" : "flex-start",
          gap: u * 0.04,
          padding: `${u * 0.03}px ${u * 0.07}px`,
        }}
      >
        {/* Capa */}
        {data.capaUrl ? (
          <img
            src={data.capaUrl}
            style={{
              width: capaW,
              height: capaH,
              objectFit: "cover",
              borderRadius: u * 0.02,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{ width: capaW, height: capaH, background: pal.accent, borderRadius: u * 0.02, flexShrink: 0 }} />
        )}

        {/* Bloco texto */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isSquare ? "flex-start" : "center",
            textAlign: isSquare ? "left" : "center",
            gap: u * 0.018,
            maxWidth: isSquare ? w * 0.48 : w * 0.84,
            flex: isSquare ? 1 : "initial",
            minWidth: 0,
          }}
        >
          {/* Tipo */}
          <div style={{ display: "flex", alignItems: "center", gap: u * 0.012, color: pal.accent, fontSize: u * 0.026, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            <span style={{ fontSize: u * 0.034 }}>{meta.icon}</span>
            <span>{meta.tag}</span>
          </div>

          {/* Título */}
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: u * 0.058,
              fontWeight: 700,
              lineHeight: 1.05,
              margin: 0,
              color: pal.fg,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.titulo}
          </h1>

          {/* Autor */}
          {data.autor && (
            <p
              style={{
                fontSize: u * 0.028,
                color: pal.sub,
                margin: 0,
                fontStyle: "italic",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {data.autor}
            </p>
          )}

          {/* Percentual + barra */}
          {template === "reading" && data.percentual != null && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: u * 0.008, marginTop: u * 0.006 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: u * 0.022, color: pal.sub }}>
                <span style={{ fontWeight: 700, color: pal.fg }}>{data.percentual}% concluído</span>
                {data.paginasLidas != null && data.totalPaginas != null && (
                  <span>{data.paginasLidas} / {data.totalPaginas} págs</span>
                )}
              </div>
              <div style={{ width: "100%", height: u * 0.012, background: "rgba(127,127,127,0.25)", borderRadius: u * 0.008, overflow: "hidden" }}>
                <div style={{ width: `${data.percentual}%`, height: "100%", background: pal.accent, borderRadius: u * 0.008 }} />
              </div>
            </div>
          )}

          {template === "completed" && data.dataConclusao && (
            <p style={{ fontSize: u * 0.024, color: pal.sub, margin: 0 }}>
              Concluído em {new Date(data.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}

          {(template === "recommend" || template === "completed") && data.nota != null && data.nota > 0 && (
            <Stars value={data.nota} size={u * 0.04} />
          )}

          {/* Comentário — área fixa, nunca empurra layout */}
          {data.comentario && (
            <div
              style={{
                width: "100%",
                maxHeight: commentMaxH,
                marginTop: u * 0.01,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <p
                style={{
                  fontSize: u * 0.026,
                  color: pal.fg,
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  margin: 0,
                  borderLeft: `${u * 0.005}px solid ${pal.accent}`,
                  paddingLeft: u * 0.022,
                  display: "-webkit-box",
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                "{data.comentario}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ShareCard.displayName = "ShareCard";
