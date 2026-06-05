import React from "react";
import logoNamzu from "@/assets/logo-namzu.png";
import { LivroResumo, EstatisticasPeriodo } from "@/hooks/leituras/useMinhasLeituras";

export const SHARE_SIZE = { w: 1080, h: 1920 };

export interface MinhasLeiturasShareProps {
  nome: string;
  periodoLabel: string;
  stats: EstatisticasPeriodo;
}

function formatTempo(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div
    style={{
      flex: 1,
      minWidth: 220,
      background: "rgba(255,255,255,0.6)",
      borderRadius: 24,
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}
  >
    <span style={{ fontSize: 22, color: "#34527A", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
      {label}
    </span>
    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 64, color: "#0F2747", fontWeight: 700, lineHeight: 1 }}>
      {value}
    </span>
  </div>
);

const LivroRow = ({ livro }: { livro: LivroResumo }) => {
  const statusText =
    livro.status === "concluido" && livro.data_fim
      ? `Concluído em ${new Date(livro.data_fim).toLocaleDateString("pt-BR")}`
      : livro.total_paginas
      ? `${livro.paginas_lidas} de ${livro.total_paginas} págs · ${livro.percentual}%`
      : `${livro.paginas_lidas} págs lidas`;

  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        background: "rgba(255,255,255,0.55)",
        borderRadius: 20,
        padding: 16,
      }}
    >
      {livro.capa_url ? (
        <img
          src={livro.capa_url}
          crossOrigin="anonymous"
          style={{ width: 72, height: 108, objectFit: "cover", borderRadius: 8, boxShadow: "0 8px 18px -8px rgba(15,39,71,0.35)" }}
        />
      ) : (
        <div style={{ width: 72, height: 108, borderRadius: 8, background: "#8FB8C8" }} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 30,
            color: "#0F2747",
            fontWeight: 700,
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {livro.titulo}
        </span>
        <span style={{ fontSize: 22, color: "#34527A" }}>{statusText}</span>
      </div>
    </div>
  );
};

export const MinhasLeiturasShareCard = React.forwardRef<HTMLDivElement, MinhasLeiturasShareProps>(
  ({ nome, periodoLabel, stats }, ref) => {
    const livrosTop = stats.livros.slice(0, 4);
    return (
      <div
        ref={ref}
        style={{
          width: SHARE_SIZE.w,
          height: SHARE_SIZE.h,
          background: "linear-gradient(160deg, #D6E9E2 0%, #B7D4DE 45%, #6F9BC2 100%)",
          color: "#0F2747",
          fontFamily: "'Inter', sans-serif",
          padding: "80px 70px",
          display: "flex",
          flexDirection: "column",
          gap: 36,
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoNamzu} crossOrigin="anonymous" style={{ width: 48, height: 48 }} />
            <span style={{ fontWeight: 700, letterSpacing: "0.28em", fontSize: 28 }}>NAMZU</span>
          </div>
          <span style={{ fontSize: 28, color: "#34527A", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginTop: 18 }}>
            {nome}
          </span>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 96, fontWeight: 700, margin: 0, lineHeight: 1 }}>
            Minhas Leituras
          </h1>
          <span style={{ fontSize: 36, color: "#34527A", fontStyle: "italic" }}>{periodoLabel}</span>
          <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 30, color: "#0F2747", margin: "10px 0 0" }}>
            “Cada página lida é um passo rumo à sabedoria.”
          </p>
        </div>

        {/* Métricas */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          <Metric label="Iniciados" value={stats.livrosIniciados} />
          <Metric label="Concluídos" value={stats.livrosConcluidos} />
          <Metric label="Páginas lidas" value={stats.paginasLidas} />
          <Metric label="Sessões" value={stats.sessoesLeitura} />
          <Metric label="Tempo" value={formatTempo(stats.tempoMinutos)} />
        </div>

        {/* Livros */}
        {livrosTop.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 24, color: "#34527A", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
              Livros do período
            </span>
            {livrosTop.map((l) => (
              <LivroRow key={l.usuario_leitura_id} livro={l} />
            ))}
          </div>
        )}

        {/* Rodapé */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 30, color: "#0F2747" }}>
            A sabedoria começa aqui.
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.2em" }}>WWW.NAMZU.COM.BR</span>
        </div>
      </div>
    );
  },
);
MinhasLeiturasShareCard.displayName = "MinhasLeiturasShareCard";
