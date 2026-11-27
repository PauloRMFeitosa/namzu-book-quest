import { forwardRef } from "react";
import { FORMATOS, cortarParaAImagem, dataDoEncontroNaImagem, type FormatoDaImagem } from "@/lib/imagemDeDivulgacao";
import logoNamzu from "@/assets/logo-namzu.png";

// Imagens de divulgação do clube. São desenhadas em tamanho real (1080 de
// largura) com estilo fixo em pixels, porque viram PNG; a tela mostra uma
// versão reduzida. Cores do tema: azul-marinho e menta.

const NAVY = "#1A3B8B";
const NAVY_ESCURO = "#12263F";
const MENTA = "#D1F2E5";
const SERIFA = "'Fraunces', Georgia, serif";
const SEM_SERIFA = "'Inter', system-ui, sans-serif";

const Moldura = forwardRef<HTMLDivElement, { formato: FormatoDaImagem; nomeClube: string; endereco: string; children: React.ReactNode }>(
  ({ formato, nomeClube, endereco, children }, ref) => {
    const { largura, altura } = FORMATOS[formato];
    return (
      <div
        ref={ref}
        style={{
          width: largura,
          height: altura,
          background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_ESCURO} 100%)`,
          color: "#FFFFFF",
          fontFamily: SEM_SERIFA,
          display: "flex",
          flexDirection: "column",
          padding: formato === "stories" ? "200px 90px 170px" : "90px 90px 80px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -180, right: -180, width: 520, height: 520, borderRadius: "50%", background: MENTA, opacity: 0.08 }} />
        <p style={{ margin: 0, fontSize: 30, letterSpacing: "0.14em", textTransform: "uppercase", color: MENTA, fontWeight: 600 }}>
          Clube de leitura
        </p>
        <p style={{ margin: "14px 0 0", fontSize: 54, lineHeight: 1.15, fontFamily: SERIFA, fontWeight: 600 }}>
          {cortarParaAImagem(nomeClube, 60)}
        </p>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>{children}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#FFFFFF", borderRadius: 999, padding: "14px 30px 14px 20px", flexShrink: 0 }}>
            <img src={logoNamzu} alt="" style={{ width: 52, height: "auto" }} />
            <span style={{ fontSize: 30, fontWeight: 800, color: NAVY, letterSpacing: "-0.01em" }}>NAMZU</span>
          </div>
          <span style={{ flex: 1, minWidth: 0, fontSize: endereco.length > 34 ? 24 : 28, lineHeight: 1.25, color: MENTA, fontWeight: 500, textAlign: "right", overflowWrap: "anywhere" }}>
            {endereco}
          </span>
        </div>
      </div>
    );
  },
);
Moldura.displayName = "Moldura";

export interface DadosDoCartao {
  formato: FormatoDaImagem;
  nomeClube: string;
  /** Endereço escrito na imagem, sem o https://. */
  endereco: string;
}

export const CartaoDoEncontro = forwardRef<
  HTMLDivElement,
  DadosDoCartao & { titulo: string; inicio: string; tipo: string }
>(({ titulo, inicio, tipo, ...moldura }, ref) => {
  const data = dataDoEncontroNaImagem(inicio);
  return (
    <Moldura ref={ref} {...moldura}>
      <p style={{ margin: 0, fontSize: 34, color: MENTA, fontWeight: 600 }}>{tipo}</p>
      <p style={{ margin: "18px 0 56px", fontSize: 84, lineHeight: 1.08, fontFamily: SERIFA, fontWeight: 600 }}>
        {cortarParaAImagem(titulo, 70)}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div style={{ background: MENTA, color: NAVY, borderRadius: 36, width: 230, height: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 110, fontWeight: 800, lineHeight: 1, fontFamily: SERIFA }}>{data.dia}</span>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "0.12em", marginTop: 6 }}>{data.mes}</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 52, fontWeight: 600 }}>{data.semana.charAt(0).toUpperCase() + data.semana.slice(1)}</p>
          <p style={{ margin: "8px 0 0", fontSize: 64, fontWeight: 700, color: MENTA }}>às {data.hora}</p>
        </div>
      </div>
    </Moldura>
  );
});
CartaoDoEncontro.displayName = "CartaoDoEncontro";

export const CartaoDaTrilha = forwardRef<
  HTMLDivElement,
  DadosDoCartao & { livro: { titulo: string; capa: string | null } | null; proximos: string[] }
>(({ livro, proximos, ...moldura }, ref) => (
  <Moldura ref={ref} {...moldura}>
    <p style={{ margin: 0, fontSize: 34, color: MENTA, fontWeight: 600 }}>Lendo agora</p>
    <div style={{ display: "flex", alignItems: "center", gap: 48, margin: "26px 0 0" }}>
      {livro?.capa ? (
        <img src={livro.capa} alt="" style={{ width: 300, height: 450, objectFit: "cover", borderRadius: 18, boxShadow: "0 24px 60px rgba(0,0,0,0.45)", flexShrink: 0 }} />
      ) : (
        <div
          style={{
            width: 300,
            height: 450,
            borderRadius: 18,
            border: `3px solid ${MENTA}`,
            background: "rgba(209, 242, 229, 0.12)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 28,
            boxSizing: "border-box",
          }}
        >
          <span style={{ fontSize: 34, lineHeight: 1.2, fontFamily: SERIFA, color: MENTA, textAlign: "center" }}>
            {cortarParaAImagem(livro?.titulo ?? "Em breve", 50)}
          </span>
        </div>
      )}
      <p style={{ margin: 0, fontSize: 70, lineHeight: 1.1, fontFamily: SERIFA, fontWeight: 600 }}>
        {cortarParaAImagem(livro?.titulo ?? "Em breve", 80)}
      </p>
    </div>
    {proximos.length > 0 && (
      <div style={{ marginTop: 60 }}>
        <p style={{ margin: 0, fontSize: 30, letterSpacing: "0.14em", textTransform: "uppercase", color: MENTA, fontWeight: 600 }}>
          Depois vem
        </p>
        {proximos.map((titulo, i) => (
          <p key={`${titulo}-${i}`} style={{ margin: "16px 0 0", fontSize: 40, lineHeight: 1.2 }}>
            {i + 1}. {cortarParaAImagem(titulo, 46)}
          </p>
        ))}
      </div>
    )}
  </Moldura>
));
CartaoDaTrilha.displayName = "CartaoDaTrilha";
