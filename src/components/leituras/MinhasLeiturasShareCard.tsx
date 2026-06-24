import React from "react";
import { LivroResumo, EstatisticasPeriodo } from "@/hooks/leituras/useMinhasLeituras";

export const SHARE_SIZE = { w: 1080, h: 1920 };

export interface MinhasLeiturasShareProps {
  nome: string;
  periodoLabel: string;
  stats: EstatisticasPeriodo;
  /** Mapa capa original -> dataURL pré-resolvido (evita CORS na captura). */
  capasResolvidas?: Record<string, string>;
  logoSrc?: string;
}

// ─── Constantes de layout (em px @ 1080×1920) ─────────────────────────────
const PH = 60;        // padding horizontal
const PT = 72;        // padding top
const PB = 72;        // padding bottom
const HEADER_H = 260;
const STATS_H  = 120;
const LABEL_H  = 40;
const FOOTER_H = 80;
const GAP = 28;       // gap entre seções

const STACK_W = SHARE_SIZE.w - 2 * PH; // 960
// 1920 - 72 - 72 - 260 - 120 - 40 - 80 - 4×28 = 1164
const STACK_H =
  SHARE_SIZE.h - PT - PB - HEADER_H - STATS_H - LABEL_H - FOOTER_H - 4 * GAP;

// ─── Parâmetros da pilha ───────────────────────────────────────────────────
const CAPA_W  = 440;
const CAPA_H  = 660;
const OFF_MAX = 150;
const OFF_MIN = 64;
const TILE_H  = 90;
const THUMB_W = 60;

// n máximo no modo CAPAS: CAPA_H + (n-1)*OFF_MIN ≤ STACK_H
const N_MAX_CAPA = Math.floor((STACK_H - CAPA_H) / OFF_MIN) + 1;

// Rotações determinísticas estáveis por índice
const ROTS = [
  -1.8, 0.9, -1.4, 0.6, -0.9, 1.5, -0.3, 1.1, -1.6, 0.7,
  -1.2, 0.4, -0.8, 1.3, -0.5, 0.9, -1.7, 0.3, -1.1, 0.8,
  -0.6, 1.4, -1.0, 0.5, -1.3, 0.7, -0.4, 1.6, -0.9, 1.2,
];

// Gradiente de fallback determinístico por título
const FB_PAIRS: [string, string][] = [
  ["#1A3B8B", "#2E9E7E"], ["#2E4A7A", "#6B3FA0"],
  ["#4A1A5C", "#9E2E6E"], ["#1A4A2E", "#2E8B57"],
  ["#5C3A1A", "#9E6E2E"], ["#1A3A5C", "#2E7EA0"],
];

function fbGrad(titulo: string): string {
  let h = 0;
  for (const c of titulo) h = (h * 31 + c.charCodeAt(0)) | 0;
  const [a, b] = FB_PAIRS[Math.abs(h) % FB_PAIRS.length];
  return `linear-gradient(160deg, ${a} 0%, ${b} 100%)`;
}

function formatTempo(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60), m = min % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Sub-componente: capa em cascata (modo CAPAS) ─────────────────────────
function Capa({ livro, i, n, url, off }: {
  livro: LivroResumo; i: number; n: number; url: string | null; off: number;
}) {
  const depth   = n <= 1 ? 0 : (n - 1 - i) / (n - 1); // 0=frente, 1=fundo
  const scale   = 1 - depth * 0.016;
  const bright  = 0.60 + 0.40 * (1 - depth);
  const rot     = ROTS[i % ROTS.length];
  const isFront = i === n - 1;

  const top  = n === 1 ? (STACK_H - CAPA_H) / 2 : i * off;
  const left = n === 1
    ? (STACK_W - CAPA_W) / 2
    : (STACK_W - CAPA_W) / 2 + rot * 4;

  // Tarja de título: no topo para livros não-frontais, na base para o frontal
  const tarjaH = isFront ? 220 : Math.min(Math.round(off * 0.85), 180);
  const tarjaBg = isFront
    ? "linear-gradient(to top, rgba(4,9,26,0.93) 0%, rgba(4,9,26,0.48) 55%, transparent 100%)"
    : "linear-gradient(to bottom, rgba(4,9,26,0.90) 0%, rgba(4,9,26,0.42) 58%, transparent 100%)";

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: CAPA_W,
        height: CAPA_H,
        zIndex: i + 1,
        transform: `scale(${scale}) rotateZ(${rot}deg)`,
        transformOrigin: "center top",
        filter: `brightness(${bright})`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: `0 ${8 + i * 2}px ${20 + i * 4}px -6px rgba(6,14,38,${0.18 + depth * 0.30})`,
      }}
    >
      {url ? (
        <img
          src={url}
          crossOrigin="anonymous"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%", height: "100%",
            background: fbGrad(livro.titulo),
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <span style={{
            fontFamily: "'Fraunces', serif", fontSize: 32, color: "rgba(255,255,255,0.92)",
            textAlign: "center", fontWeight: 700, lineHeight: 1.2,
          }}>
            {livro.titulo}
          </span>
        </div>
      )}

      {/* Tarja com título */}
      <div
        style={{
          position: "absolute",
          [isFront ? "bottom" : "top"]: 0,
          left: 0, right: 0,
          height: tarjaH,
          background: tarjaBg,
          padding: isFront ? "0 18px 18px" : "14px 18px 0",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          justifyContent: isFront ? "flex-end" : "flex-start",
        }}
      >
        <span style={{
          fontFamily: "'Fraunces', serif", fontSize: 30, color: "#fff", fontWeight: 700,
          lineHeight: 1.15,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {livro.titulo}
        </span>
        {livro.autor && (
          <span style={{ fontSize: 21, color: "rgba(255,255,255,0.78)", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {livro.autor}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: telha horizontal (modo TELHAS) ───────────────────────
function Telha({ livro, i, n, url, off }: {
  livro: LivroResumo; i: number; n: number; url: string | null; off: number;
}) {
  const depth      = n <= 1 ? 0 : (n - 1 - i) / (n - 1);
  const bright     = 0.68 + 0.32 * (1 - depth);
  const rot        = ROTS[i % ROTS.length] * 0.3; // rotação sutil
  const showText   = off > 46;
  const showAuthor = off > 72;
  const titleFs    = off > 70 ? 28 : 22;
  const isFront    = i === n - 1;

  return (
    <div
      style={{
        position: "absolute",
        top: i * off,
        left: 0,
        right: 0,
        height: isFront ? STACK_H - i * off : TILE_H,
        zIndex: i + 1,
        filter: `brightness(${bright})`,
        transform: `rotateZ(${rot}deg)`,
        transformOrigin: "center top",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: isFront ? "auto" : TILE_H,
          minHeight: TILE_H,
          background: i % 2 === 0 ? "rgba(255,255,255,0.76)" : "rgba(222,236,250,0.76)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `0 4px 18px -4px rgba(6,14,38,${0.12 + depth * 0.24})`,
        }}
      >
        {/* Miniatura */}
        <div style={{ width: THUMB_W, flexShrink: 0, overflow: "hidden", alignSelf: "stretch" }}>
          {url ? (
            <img
              src={url}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: fbGrad(livro.titulo) }} />
          )}
        </div>

        {/* Texto */}
        {showText && (
          <div style={{
            flex: 1, minWidth: 0,
            padding: "0 16px",
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 4,
          }}>
            <span style={{
              fontFamily: "'Fraunces', serif", fontSize: titleFs, color: "#0F2747",
              fontWeight: 700, lineHeight: 1.1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {livro.titulo}
            </span>
            {showAuthor && livro.autor && (
              <span style={{ fontSize: 19, color: "#34527A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {livro.autor}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
export const MinhasLeiturasShareCard = React.forwardRef<HTMLDivElement, MinhasLeiturasShareProps>(
  ({ nome, periodoLabel, stats, capasResolvidas, logoSrc }, ref) => {
    // Ordena cronologicamente: primeiro lido no fundo, último na frente
    const livros = [...stats.livros].sort((a, b) => {
      const da = (a.data_fim ?? a.ultima_sessao ?? "") as string;
      const db = (b.data_fim ?? b.ultima_sessao ?? "") as string;
      return da.localeCompare(db);
    });
    const n = livros.length;

    const getCapa = (url?: string | null) =>
      (url && capasResolvidas?.[url]) || url || null;

    // Modo e offset
    const usaCapas = n <= N_MAX_CAPA;
    const off =
      n <= 1
        ? 0
        : usaCapas
          ? Math.min(OFF_MAX, Math.max(OFF_MIN, (STACK_H - CAPA_H) / (n - 1)))
          : (STACK_H - TILE_H) / (n - 1);

    return (
      <div
        ref={ref}
        style={{
          width: SHARE_SIZE.w,
          height: SHARE_SIZE.h,
          background: "linear-gradient(160deg, #D6E9E2 0%, #B7D4DE 45%, #6F9BC2 100%)",
          color: "#0F2747",
          fontFamily: "'Inter', sans-serif",
          padding: `${PT}px ${PH}px ${PB}px`,
          display: "flex",
          flexDirection: "column",
          gap: GAP,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ height: HEADER_H, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            {logoSrc && (
              <img
                src={logoSrc}
                crossOrigin="anonymous"
                style={{ width: 44, height: 44, objectFit: "contain" }}
              />
            )}
            <span style={{ fontWeight: 700, letterSpacing: "0.28em", fontSize: 26, color: "#0F2747" }}>
              NAMZU
            </span>
          </div>
          <span style={{ fontSize: 22, color: "#2E9E7E", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
            {nome}
          </span>
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontSize: 80, fontWeight: 700,
            margin: 0, lineHeight: 1, color: "#0F2747",
          }}>
            Minhas<br />Leituras
          </h1>
          <span style={{ fontSize: 28, color: "#34527A", fontStyle: "italic" }}>
            {periodoLabel}
          </span>
        </div>

        {/* ── Stats com divisórias ─────────────────────────────────── */}
        <div style={{
          height: STATS_H,
          flexShrink: 0,
          display: "flex",
          background: "rgba(255,255,255,0.58)",
          borderRadius: 22,
          overflow: "hidden",
        }}>
          {[
            { label: "Livros",  value: n },
            { label: "Páginas", value: stats.paginasLidas },
            { label: "Sessões", value: stats.sessoesLeitura },
            { label: "Tempo",   value: formatTempo(stats.tempoMinutos) },
          ].map(({ label, value }, idx) => (
            <React.Fragment key={label}>
              {idx > 0 && (
                <div style={{ width: 1, background: "rgba(15,39,71,0.15)", margin: "18px 0", flexShrink: 0 }} />
              )}
              <div style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "10px 8px",
              }}>
                <span style={{
                  fontFamily: "'Fraunces', serif", fontSize: 50, color: "#0F2747",
                  fontWeight: 700, lineHeight: 1,
                }}>
                  {value}
                </span>
                <span style={{
                  fontSize: 17, color: "#34527A", letterSpacing: "0.12em",
                  textTransform: "uppercase", fontWeight: 600, marginTop: 6,
                }}>
                  {label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ── Rótulo ──────────────────────────────────────────────── */}
        <div style={{ height: LABEL_H, flexShrink: 0, display: "flex", alignItems: "center" }}>
          <span style={{
            fontSize: 21, color: "#34527A", letterSpacing: "0.18em",
            textTransform: "uppercase", fontWeight: 700,
          }}>
            Livros do período
          </span>
        </div>

        {/* ── Pilha ───────────────────────────────────────────────── */}
        <div style={{ position: "relative", height: STACK_H, flexShrink: 0, overflow: "hidden" }}>
          {n === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28, color: "#34527A", fontStyle: "italic", opacity: 0.7 }}>
                Nenhum livro no período
              </span>
            </div>
          ) : (
            <>
              {/* Sombra de mesa */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: "10%",
                right: "10%",
                height: 56,
                background: "radial-gradient(ellipse at 50% 100%, rgba(6,14,38,0.28) 0%, transparent 72%)",
                zIndex: 0,
                pointerEvents: "none",
              }} />

              {livros.map((l, i) =>
                usaCapas ? (
                  <Capa
                    key={l.usuario_leitura_id}
                    livro={l}
                    i={i}
                    n={n}
                    url={getCapa(l.capa_url)}
                    off={off}
                  />
                ) : (
                  <Telha
                    key={l.usuario_leitura_id}
                    livro={l}
                    i={i}
                    n={n}
                    url={getCapa(l.capa_url)}
                    off={off}
                  />
                )
              )}
            </>
          )}
        </div>

        {/* ── Rodapé ──────────────────────────────────────────────── */}
        <div style={{
          height: FOOTER_H,
          flexShrink: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 4,
        }}>
          <span style={{
            fontFamily: "'Fraunces', serif", fontStyle: "italic",
            fontSize: 27, color: "#0F2747",
          }}>
            A sabedoria começa aqui.
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.22em", color: "#0F2747" }}>
            NAMZU.COM.BR
          </span>
        </div>
      </div>
    );
  },
);
MinhasLeiturasShareCard.displayName = "MinhasLeiturasShareCard";
