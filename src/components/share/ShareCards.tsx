import React from "react";
import logoNamzu from "@/assets/logo-namzu.png";

export type ShareFormat = "feed" | "story" | "square" | "whatsapp";
export type ShareStyle = "light" | "dark" | "gradient" | "cover";
export type ShareTemplate = "recommend" | "reading" | "completed";

export const FORMAT_SIZES: Record<ShareFormat, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed Instagram" },
  story: { w: 1080, h: 1920, label: "Story Instagram" },
  square: { w: 1080, h: 1080, label: "Quadrado" },
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
  /** Cores extraídas da capa (hex) — opcional */
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

const Watermark = ({ fg, sub, size }: { fg: string; sub: string; size: number }) => (
  <>
    <div style={{ position: "absolute", top: size * 0.04, left: size * 0.05, display: "flex", alignItems: "center", gap: size * 0.012 }}>
      <img src="/logo-namzu.png" crossOrigin="anonymous" style={{ width: size * 0.07, height: size * 0.07, objectFit: "contain" }} />
      <span style={{ fontFamily: "'Fraunces', serif", color: fg, fontSize: size * 0.035, fontWeight: 700, letterSpacing: "0.02em" }}>Namzu</span>
    </div>
    <div style={{ position: "absolute", bottom: size * 0.04, right: size * 0.05, display: "flex", alignItems: "center", gap: size * 0.01 }}>
      <img src="/logo-namzu.png" crossOrigin="anonymous" style={{ width: size * 0.035, height: size * 0.035, objectFit: "contain", opacity: 0.8 }} />
      <span style={{ color: sub, fontSize: size * 0.018, fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: "0.05em" }}>www.namzu.com.br</span>
    </div>
  </>
);

interface CardProps {
  data: ShareData;
  template: ShareTemplate;
  format: ShareFormat;
  style: ShareStyle;
}

const TEMPLATE_LABEL: Record<ShareTemplate, { tag: string; icon: string }> = {
  recommend: { tag: "Recomendo esta leitura", icon: "📚" },
  reading: { tag: "Estou lendo", icon: "📖" },
  completed: { tag: "Leitura concluída", icon: "✅" },
};

export const ShareCard = React.forwardRef<HTMLDivElement, CardProps>(({ data, template, format, style }, ref) => {
  const { w, h } = FORMAT_SIZES[format];
  const pal = palettes[style];
  // unidade de escala (lado menor)
  const u = Math.min(w, h);
  const isPortrait = h > w;
  const isSquare = w === h;
  const meta = TEMPLATE_LABEL[template];

  const capaW = isSquare ? u * 0.42 : u * 0.55;
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
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Watermark fg={pal.fg} sub={pal.sub} size={u} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isSquare ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: u * 0.05,
          padding: `${u * 0.14}px ${u * 0.08}px ${u * 0.12}px`,
        }}
      >
        {/* Capa */}
        {data.capaUrl ? (
          <img
            src={data.capaUrl}
            crossOrigin="anonymous"
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
          <div style={{ width: capaW, height: capaH, background: pal.accent, borderRadius: u * 0.02 }} />
        )}

        {/* Conteúdo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: isSquare ? "flex-start" : "center", textAlign: isSquare ? "left" : "center", gap: u * 0.025, maxWidth: isSquare ? w * 0.45 : w * 0.82 }}>
          <div style={{ display: "flex", alignItems: "center", gap: u * 0.015, color: pal.accent, fontSize: u * 0.028, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            <span style={{ fontSize: u * 0.04 }}>{meta.icon}</span>
            <span>{meta.tag}</span>
          </div>

          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: u * 0.07, fontWeight: 700, lineHeight: 1.05, margin: 0, color: pal.fg }}>
            {data.titulo}
          </h1>

          {data.autor && (
            <p style={{ fontSize: u * 0.032, color: pal.sub, margin: 0, fontStyle: "italic" }}>{data.autor}</p>
          )}

          {/* Específicos por template */}
          {template === "reading" && data.percentual != null && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: u * 0.012, marginTop: u * 0.02 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: u * 0.028, color: pal.sub }}>
                <span style={{ fontWeight: 700, color: pal.fg }}>{data.percentual}% concluído</span>
                {data.paginasLidas != null && data.totalPaginas != null && (
                  <span>{data.paginasLidas} / {data.totalPaginas} págs</span>
                )}
              </div>
              <div style={{ width: "100%", height: u * 0.018, background: "rgba(127,127,127,0.25)", borderRadius: u * 0.01, overflow: "hidden" }}>
                <div style={{ width: `${data.percentual}%`, height: "100%", background: pal.accent, borderRadius: u * 0.01 }} />
              </div>
            </div>
          )}

          {template === "completed" && data.dataConclusao && (
            <p style={{ fontSize: u * 0.026, color: pal.sub, margin: 0 }}>
              Concluído em {new Date(data.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}

          {(template === "recommend" || template === "completed") && data.nota != null && data.nota > 0 && (
            <Stars value={data.nota} size={u * 0.045} />
          )}

          {data.comentario && (
            <p
              style={{
                fontSize: u * 0.032,
                color: pal.fg,
                fontStyle: "italic",
                lineHeight: 1.4,
                margin: 0,
                marginTop: u * 0.015,
                borderLeft: `${u * 0.006}px solid ${pal.accent}`,
                paddingLeft: u * 0.025,
                maxWidth: "100%",
              }}
            >
              "{data.comentario}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
ShareCard.displayName = "ShareCard";
