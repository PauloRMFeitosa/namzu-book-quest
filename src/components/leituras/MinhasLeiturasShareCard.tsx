import React from "react";
import logoNamzu from "@/assets/logo-namzu.png";
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

function formatTempo(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function statusLine(l: LivroResumo) {
  if (l.status === "concluido") return "Concluído";
  if (l.total_paginas && l.total_paginas > 0) {
    return `${l.paginas_lidas} págs · ${l.percentual}%`;
  }
  return `${l.paginas_lidas} págs lidas`;
}

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div
    style={{
      flex: "1 1 0",
      minWidth: 0,
      background: "rgba(255,255,255,0.6)",
      borderRadius: 22,
      padding: "20px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}
  >
    <span style={{ fontSize: 18, color: "#34527A", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
      {label}
    </span>
    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 44, color: "#0F2747", fontWeight: 700, lineHeight: 1 }}>
      {value}
    </span>
  </div>
);

export const MinhasLeiturasShareCard = React.forwardRef<HTMLDivElement, MinhasLeiturasShareProps>(
  ({ nome, periodoLabel, stats, capasResolvidas, logoSrc }, ref) => {
    const livros = stats.livros;
    const n = livros.length;

    // Grid adaptativo: define colunas conforme quantidade
    const cols = n <= 3 ? 1 : n <= 8 ? 2 : n <= 15 ? 3 : 4;
    const capaH = cols === 1 ? 200 : cols === 2 ? 230 : cols === 3 ? 220 : 200;
    const tituloFs = cols === 1 ? 26 : cols === 2 ? 22 : cols === 3 ? 18 : 16;
    const statusFs = cols === 1 ? 20 : cols === 2 ? 16 : cols === 3 ? 14 : 12;

    const getCapa = (url?: string | null) => (url && capasResolvidas?.[url]) || url || null;

    return (
      <div
        ref={ref}
        style={{
          width: SHARE_SIZE.w,
          height: SHARE_SIZE.h,
          background: "linear-gradient(160deg, #D6E9E2 0%, #B7D4DE 45%, #6F9BC2 100%)",
          color: "#0F2747",
          fontFamily: "'Inter', sans-serif",
          padding: "70px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {logoSrc && <img src={logoSrc} crossOrigin="anonymous" style={{ width: 44, height: 44 }} />}
            <span style={{ fontWeight: 700, letterSpacing: "0.28em", fontSize: 24 }}>NAMZU</span>
          </div>
          <span style={{ fontSize: 24, color: "#34527A", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginTop: 14 }}>
            {nome}
          </span>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 80, fontWeight: 700, margin: 0, lineHeight: 1 }}>
            Minhas Leituras
          </h1>
          <span style={{ fontSize: 30, color: "#34527A", fontStyle: "italic" }}>{periodoLabel}</span>
        </div>

        {/* Métricas */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Metric label="Livros" value={n} />
          <Metric label="Páginas" value={stats.paginasLidas} />
          <Metric label="Sessões" value={stats.sessoesLeitura} />
          <Metric label="Tempo" value={formatTempo(stats.tempoMinutos)} />
        </div>

        {/* Livros */}
        {n > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>
            <span style={{ fontSize: 20, color: "#34527A", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
              Livros do período
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: cols === 1 ? 16 : 14,
                alignContent: "start",
              }}
            >
              {livros.map((l) => {
                const capa = getCapa(l.capa_url);
                return (
                  <div
                    key={l.usuario_leitura_id}
                    style={{
                      display: "flex",
                      flexDirection: cols === 1 ? "row" : "column",
                      gap: cols === 1 ? 18 : 10,
                      background: "rgba(255,255,255,0.55)",
                      borderRadius: 18,
                      padding: cols === 1 ? 16 : 12,
                      alignItems: cols === 1 ? "center" : "stretch",
                    }}
                  >
                    {capa ? (
                      <img
                        src={capa}
                        crossOrigin="anonymous"
                        style={{
                          width: cols === 1 ? capaH * 0.7 : "100%",
                          height: capaH,
                          objectFit: "cover",
                          borderRadius: 10,
                          boxShadow: "0 8px 18px -8px rgba(15,39,71,0.35)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: cols === 1 ? capaH * 0.7 : "100%",
                          height: capaH,
                          borderRadius: 10,
                          background: "#8FB8C8",
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontSize: tituloFs,
                          color: "#0F2747",
                          fontWeight: 700,
                          lineHeight: 1.15,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {l.titulo}
                      </span>
                      <span style={{ fontSize: statusFs, color: "#34527A" }}>{statusLine(l)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 28, color: "#0F2747" }}>
            A sabedoria começa aqui.
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.2em" }}>WWW.NAMZU.COM.BR</span>
        </div>
      </div>
    );
  },
);
MinhasLeiturasShareCard.displayName = "MinhasLeiturasShareCard";
