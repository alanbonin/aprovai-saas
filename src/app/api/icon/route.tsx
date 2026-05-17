import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ── Gera ícones PWA da AprovAI360 em qualquer tamanho ───────────────────────
// Uso: /api/icon?size=192  ou  /api/icon?size=512
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Math.max(64, Math.min(1024, parseInt(searchParams.get("size") ?? "192", 10)));
  const r    = size * 0.22;   // border-radius

  const teal   = "#0ab5bd";
  const navy   = "#0d1b2a";
  const tealDk = "#066d73";

  return new ImageResponse(
    (
      <div
        style={{
          width:           size,
          height:          size,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      navy,
          borderRadius:    r,
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* teal glow halo */}
        <div
          style={{
            position:     "absolute",
            width:        size * 0.80,
            height:       size * 0.80,
            borderRadius: "50%",
            background:   `radial-gradient(circle, rgba(10,181,189,0.18) 0%, transparent 70%)`,
          }}
        />

        {/* wordmark: Aprov in white, AI in teal, 360 in white */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            position:       "relative",
            gap:            size * 0.02,
          }}
        >
          {/* A icon circle */}
          <div
            style={{
              width:        size * 0.44,
              height:       size * 0.44,
              borderRadius: "50%",
              border:       `${size * 0.022}px solid ${teal}`,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              background:   `radial-gradient(circle at 38% 32%, #6de8ee 0%, ${teal} 45%, ${tealDk} 100%)`,
              marginBottom: size * 0.04,
            }}
          />

          {/* wordmark */}
          <div
            style={{
              display:       "flex",
              fontSize:      size * 0.165,
              fontWeight:    900,
              letterSpacing: "-0.03em",
              lineHeight:    1,
            }}
          >
            <span style={{ color: "white" }}>Aprov</span>
            <span style={{ color: teal }}>AI</span>
            <span style={{ color: "white" }}>360</span>
          </div>
        </div>
      </div>
    ),
    {
      width:  size,
      height: size,
    }
  );
}
