/**
 * NamzuBackground
 * Full-bleed inline SVG watermark inspired by the Namzu brand:
 * an open book supporting a ribbon "N" that grows into a constellation
 * of knowledge nodes topped by a small sparkle.
 *
 * Pure inline SVG — no external images. Mint (#A7E8D5) at very low
 * opacity over a clean white base, so it sits quietly behind content.
 */
export const NamzuBackground = ({ className = "" }: { className?: string }) => {
  const mint = "#A7E8D5";

  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
      className={`pointer-events-none overflow-hidden ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
      >
        {/* ───────── Constellation / knowledge graph (background layer) ───────── */}
        <g stroke={mint} strokeWidth="1" fill="none" opacity="0.50" strokeLinecap="round">
          <line x1="120" y1="140" x2="320" y2="220" />
          <line x1="320" y1="220" x2="500" y2="120" />
          <line x1="500" y1="120" x2="720" y2="200" />
          <line x1="720" y1="200" x2="940" y2="110" />
          <line x1="940" y1="110" x2="1180" y2="180" />
          <line x1="1180" y1="180" x2="1340" y2="90" />

          <line x1="80" y1="760" x2="280" y2="700" />
          <line x1="280" y1="700" x2="480" y2="780" />
          <line x1="480" y1="780" x2="720" y2="720" />
          <line x1="720" y1="720" x2="980" y2="800" />
          <line x1="980" y1="800" x2="1240" y2="720" />
          <line x1="1240" y1="720" x2="1380" y2="790" />

          <line x1="180" y1="420" x2="380" y2="520" />
          <line x1="380" y1="520" x2="220" y2="620" />
          <line x1="1060" y1="380" x2="1260" y2="460" />
          <line x1="1260" y1="460" x2="1180" y2="600" />
        </g>

        {/* Scattered knowledge nodes (dots, tiny squares, triangles) */}
        <g fill={mint} opacity="0.45">
          <circle cx="120" cy="140" r="3" />
          <circle cx="500" cy="120" r="2.5" />
          <circle cx="940" cy="110" r="3" />
          <circle cx="1340" cy="90" r="2.5" />
          <circle cx="80" cy="760" r="3" />
          <circle cx="480" cy="780" r="2.5" />
          <circle cx="980" cy="800" r="3" />
          <circle cx="1380" cy="790" r="2.5" />
          <circle cx="180" cy="420" r="2.5" />
          <circle cx="1180" cy="600" r="2.5" />
          <circle cx="640" cy="60" r="2" />
          <circle cx="820" cy="850" r="2" />

          <rect x="318" y="218" width="4" height="4" />
          <rect x="718" y="198" width="4" height="4" />
          <rect x="1178" y="178" width="4" height="4" />
          <rect x="278" y="698" width="4" height="4" />
          <rect x="718" y="718" width="4" height="4" />
          <rect x="1238" y="718" width="4" height="4" />
          <rect x="378" y="518" width="4" height="4" />
          <rect x="1058" y="378" width="4" height="4" />
        </g>

        <g fill="none" stroke={mint} strokeWidth="1" opacity="0.50">
          <polygon points="220,620 250,600 240,640" />
          <polygon points="1260,460 1290,440 1280,480" />
          <polygon points="640,60 660,40 670,70" />
        </g>

        {/* ───────── Central Namzu logo silhouette (~70% viewport) ───────── */}
        {/* Anchored around (720, 450); spans roughly 1000×630 */}
        <g opacity="0.65">
          {/* Open book base */}
          <g fill="none" stroke={mint} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
            {/* Book outer silhouette */}
            <path d="M 260 640
                     C 380 590, 560 580, 720 620
                     C 880 580, 1060 590, 1180 640
                     L 1180 760
                     C 1060 710, 880 700, 720 740
                     C 560 700, 380 710, 260 760
                     Z" />
            {/* Spine */}
            <line x1="720" y1="620" x2="720" y2="740" />
            {/* Page lines — left */}
            <path d="M 340 660 C 460 630, 600 625, 700 650" />
            <path d="M 340 690 C 460 660, 600 655, 700 680" />
            <path d="M 340 720 C 460 690, 600 685, 700 710" />
            {/* Page lines — right */}
            <path d="M 740 650 C 840 625, 980 630, 1100 660" />
            <path d="M 740 680 C 840 655, 980 660, 1100 690" />
            <path d="M 740 710 C 840 685, 980 690, 1100 720" />
          </g>

          {/* Ribbon "N" rising from the book */}
          <g fill={mint}>
            <path d="M 540 620
                     L 540 240
                     L 620 240
                     L 880 540
                     L 880 240
                     L 960 240
                     L 960 620
                     L 880 620
                     L 620 320
                     L 620 620
                     Z" />
          </g>
          {/* Ribbon highlight stroke */}
          <path
            d="M 540 620 L 540 240 L 620 240 L 880 540 L 880 240 L 960 240 L 960 620"
            fill="none"
            stroke={mint}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Geometric triangle network rising from top-right of the N */}
          <g fill="none" stroke={mint} strokeWidth="1.5" strokeLinejoin="round">
            <polygon points="960,240 1040,170 960,140" />
            <polygon points="1040,170 1120,210 1040,260" />
            <polygon points="1040,170 1120,100 1180,170" />
            <polygon points="1120,100 1200,60 1240,130" />
            <polygon points="1180,170 1260,200 1240,130" />
            <polygon points="1200,60 1280,90 1260,30" />
          </g>
          {/* Nodes on the triangle vertices */}
          <g fill={mint}>
            <circle cx="960" cy="240" r="3.5" />
            <circle cx="1040" cy="170" r="3" />
            <circle cx="1120" cy="210" r="3" />
            <circle cx="1120" cy="100" r="3" />
            <circle cx="1180" cy="170" r="3" />
            <circle cx="1200" cy="60" r="3" />
            <circle cx="1260" cy="200" r="2.5" />
            <circle cx="1280" cy="90" r="2.5" />
            <circle cx="1260" cy="30" r="2.5" />
          </g>

          {/* Sparkle / four-point star above the network */}
          <g fill={mint}>
            <path d="M 1310 40
                     L 1322 70
                     L 1352 82
                     L 1322 94
                     L 1310 124
                     L 1298 94
                     L 1268 82
                     L 1298 70 Z" />
          </g>
        </g>

        {/* Soft mint halo behind the logo to lift it slightly */}
        <defs>
          <radialGradient id="namzu-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={mint} stopOpacity="0.05" />
            <stop offset="70%" stopColor={mint} stopOpacity="0.02" />
            <stop offset="100%" stopColor={mint} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="720" cy="450" rx="620" ry="380" fill="url(#namzu-halo)" />
      </svg>
    </div>
  );
};

export default NamzuBackground;
