import React from "react";
import logoNamzu from "@/assets/logo-namzu.png";

export type ShareFormat = "square" | "story";
export type ShareStyle = "light" | "dark" | "gradient";
export type ShareTemplate = "recommend" | "reading" | "completed";

export const COMMENT_MAX = 140;

export const FORMAT_SIZES: Record<ShareFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Quadrado" },
  story: { w: 1080, h: 1920, label: "Story" },
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

const Stars = ({ value, size, color }: { value: number; size: number; color: string }) => (
  <div style={{ display: "flex", gap: size * 0.12 }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const filled = i < Math.round(value);
      return (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={1.5}>
          <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
        </svg>
      );
    })}
  </div>
);

interface Palette {
  bg: string;
  fg: string;
  sub: string;
  accent: string;
  accentSoft: string;
  waveTop: string;
  waveBottom: string;
  tagBg: string;
  tagFg: string;
  shadow: string;
}

const palettes: Record<ShareStyle, Palette> = {
  light: {
    bg: "linear-gradient(180deg, #FBFCFD 0%, #EEF3F2 100%)",
    fg: "#0F2747",
    sub: "#5A6B85",
    accent: "#1A3B8B",
    accentSoft: "#8FB8C8",
    waveTop: "rgba(143,184,200,0.35)",
    waveBottom: "#1A3B8B",
    tagBg: "rgba(143,184,200,0.25)",
    tagFg: "#1A3B8B",
    shadow: "0 30px 60px -25px rgba(15,39,71,0.35)",
  },
  dark: {
    bg: "linear-gradient(180deg, #0B1626 0%, #0F2747 100%)",
    fg: "#F2F6FA",
    sub: "#9CB0CC",
    accent: "#88B4D8",
    accentSoft: "#3A5A8C",
    waveTop: "rgba(136,180,216,0.18)",
    waveBottom: "#88B4D8",
    tagBg: "rgba(136,180,216,0.18)",
    tagFg: "#C9DEF0",
    shadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
  },
  gradient: {
    bg: "linear-gradient(160deg, #D6E9E2 0%, #B7D4DE 45%, #6F9BC2 100%)",
    fg: "#0F2747",
    sub: "#34527A",
    accent: "#0F2747",
    accentSoft: "#FFFFFF",
    waveTop: "rgba(255,255,255,0.4)",
    waveBottom: "#0F2747",
    tagBg: "rgba(255,255,255,0.55)",
    tagFg: "#0F2747",
    shadow: "0 30px 60px -20px rgba(15,39,71,0.45)",
  },
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

const SpineWatermark = ({ pal, u, capaH }: { pal: Palette; u: number; capaH: number }) => (
  <div
    style={{
      height: capaH,
      width: u * 0.04,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <span
      style={{
        color: pal.sub,
        fontSize: u * 0.018,
        letterSpacing: "0.35em",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        transform: "rotate(-90deg)",
        transformOrigin: "center",
        opacity: 0.65,
      }}
    >
      www.namzu.com.br
    </span>
  </div>
);

export const ShareCard = React.forwardRef<HTMLDivElement, CardProps>(({ data, template, format, style }, ref) => {
  const { w, h } = FORMAT_SIZES[format];
  const pal = palettes[style];
  const u = Math.min(w, h);
  const isSquare = w === h;
  const meta = TEMPLATE_LABEL[template];

  const capaW = isSquare ? u * 0.34 : u * 0.56;
  const capaH = capaW * 1.5;

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
      {/* Brand top-left — discreta */}
      <div
        style={{
          position: "absolute",
          top: u * 0.045,
          left: u * 0.06,
          display: "flex",
          alignItems: "center",
          gap: u * 0.012,
          zIndex: 2,
        }}
      >
        <img src={logoNamzu} style={{ width: u * 0.04, height: u * 0.04, objectFit: "contain" }} crossOrigin="anonymous" />
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            color: pal.fg,
            fontSize: u * 0.024,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          Namzu
        </span>
      </div>



      {/* Conteúdo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: u * 0.12,
          paddingBottom: u * 0.11,
          paddingLeft: u * 0.11,
          paddingRight: u * 0.08,
          display: "flex",
          flexDirection: isSquare ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSquare ? u * 0.05 : u * 0.035,
          zIndex: 1,
        }}
      >
        {/* Story: tipo + título no topo */}
        {!isSquare && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: u * 0.018, textAlign: "center", maxWidth: w * 0.82 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: u * 0.012,
                padding: `${u * 0.012}px ${u * 0.028}px`,
                background: pal.tagBg,
                borderRadius: 999,
                color: pal.tagFg,
                fontSize: u * 0.022,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: u * 0.028 }}>{meta.icon}</span>
              <span>{meta.tag}</span>
            </div>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: u * 0.07,
                fontWeight: 700,
                lineHeight: 1.05,
                margin: 0,
                color: pal.fg,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {data.titulo}
            </h1>
            {data.autor && (
              <p style={{ fontSize: u * 0.03, color: pal.sub, margin: 0, fontStyle: "italic" }}>{data.autor}</p>
            )}
            <div style={{ width: u * 0.08, height: 2, background: pal.accent, marginTop: u * 0.005 }} />
          </div>
        )}

        {/* Capa */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {data.capaUrl ? (
            <img
              src={data.capaUrl}
              crossOrigin="anonymous"
              style={{
                width: capaW,
                height: capaH,
                objectFit: "contain",
                borderRadius: u * 0.015,
                boxShadow: pal.shadow,
                background: "rgba(0,0,0,0.04)",
              }}
            />
          ) : (
            <div
              style={{
                width: capaW,
                height: capaH,
                background: pal.accentSoft,
                borderRadius: u * 0.015,
                boxShadow: pal.shadow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: pal.fg,
                fontFamily: "'Fraunces', serif",
                fontSize: u * 0.05,
              }}
            >
              {data.titulo.slice(0, 1)}
            </div>
          )}
        </div>

        {/* Square: bloco direito com texto */}
        {isSquare && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: u * 0.018,
              maxWidth: w * 0.46,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: u * 0.01,
                padding: `${u * 0.01}px ${u * 0.024}px`,
                background: pal.tagBg,
                borderRadius: 999,
                color: pal.tagFg,
                fontSize: u * 0.02,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: u * 0.024 }}>{meta.icon}</span>
              <span>{meta.tag}</span>
            </div>

            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: u * 0.064,
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

            {data.autor && (
              <p style={{ fontSize: u * 0.028, color: pal.sub, margin: 0, fontStyle: "italic" }}>{data.autor}</p>
            )}

            <div style={{ width: u * 0.06, height: 2, background: pal.accent, margin: `${u * 0.005}px 0` }} />

            {template === "reading" && data.percentual != null && (
              <ReadingProgress pal={pal} u={u} data={data} width="100%" />
            )}

            {template === "completed" && data.dataConclusao && (
              <p style={{ fontSize: u * 0.022, color: pal.sub, margin: 0 }}>
                Concluído em{" "}
                {new Date(data.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}

            {(template === "recommend" || template === "completed") && data.nota != null && data.nota > 0 && (
              <Stars value={data.nota} size={u * 0.034} color={pal.accent} />
            )}

            {data.comentario && <Comment pal={pal} u={u} text={data.comentario} />}
          </div>
        )}

        {/* Story: bloco inferior com progresso/comentário */}
        {!isSquare && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: u * 0.018,
              maxWidth: w * 0.78,
              width: "100%",
            }}
          >
            {template === "reading" && data.percentual != null && (
              <ReadingProgress pal={pal} u={u} data={data} width="78%" />
            )}

            {template === "completed" && data.dataConclusao && (
              <p style={{ fontSize: u * 0.024, color: pal.sub, margin: 0 }}>
                Concluído em{" "}
                {new Date(data.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}

            {(template === "recommend" || template === "completed") && data.nota != null && data.nota > 0 && (
              <Stars value={data.nota} size={u * 0.034} color={pal.accent} />
            )}

            {data.comentario && <Comment pal={pal} u={u} text={data.comentario} center />}
          </div>
        )}
      </div>

      {/* Footer URL */}
      <div
        style={{
          position: "absolute",
          bottom: u * 0.035,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <span
          style={{
            color: style === "dark" ? "#F2F6FA" : style === "gradient" ? "#FFFFFF" : "#FFFFFF",
            fontSize: u * 0.022,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.18em",
          }}
        >
          www.namzu.com.br
        </span>
      </div>
    </div>
  );
});
ShareCard.displayName = "ShareCard";

const ReadingProgress = ({ pal, u, data, width }: { pal: Palette; u: number; data: ShareData; width: string }) => (
  <div style={{ width, display: "flex", flexDirection: "column", gap: u * 0.008 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: u * 0.022, color: pal.sub }}>
      <span style={{ fontWeight: 700, color: pal.fg }}>{data.percentual}% concluído</span>
      {data.paginasLidas != null && data.totalPaginas != null && (
        <span>
          {data.paginasLidas} / {data.totalPaginas} págs
        </span>
      )}
    </div>
    <div style={{ width: "100%", height: u * 0.01, background: "rgba(127,127,127,0.22)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${data.percentual}%`, height: "100%", background: pal.accent, borderRadius: 999 }} />
    </div>
  </div>
);

const Comment = ({ pal, u, text, center }: { pal: Palette; u: number; text: string; center?: boolean }) => (
  <div
    style={{
      width: "100%",
      marginTop: u * 0.008,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: center ? "center" : "flex-start",
      gap: u * 0.008,
    }}
  >
    <span style={{ fontFamily: "'Fraunces', serif", fontSize: u * 0.05, color: pal.accent, lineHeight: 0.8 }}>“</span>
    <p
      style={{
        fontSize: u * 0.026,
        color: pal.fg,
        fontStyle: "italic",
        lineHeight: 1.4,
        margin: 0,
        textAlign: center ? "center" : "left",
        display: "-webkit-box",
        WebkitLineClamp: 4,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {text}
    </p>
  </div>
);
