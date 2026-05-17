import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ── Gera ícones PWA da Aprovai em qualquer tamanho ─────────────────────────
// Uso: /api/icon?size=192  ou  /api/icon?size=512
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Math.max(64, Math.min(1024, parseInt(searchParams.get("size") ?? "192", 10)));
  const pad  = size * 0.18;
  const r    = size * 0.22;   // border-radius

  return new ImageResponse(
    (
      <div
        style={{
          width:           size,
          height:          size,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "linear-gradient(135deg, #0f0c29 0%, #1a1042 50%, #0d0a1e 100%)",
          borderRadius:    r,
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* glow ring */}
        <div
          style={{
            position:     "absolute",
            width:        size * 0.75,
            height:       size * 0.75,
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)",
          }}
        />

        {/* central content */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            size * 0.04,
            paddingBottom:  pad * 0.2,
            position:       "relative",
          }}
        >
          {/* graduation cap emoji */}
          <div style={{ fontSize: size * 0.38, lineHeight: 1 }}>🎓</div>

          {/* wordmark */}
          <div
            style={{
              fontSize:    size * 0.155,
              fontWeight:  900,
              letterSpacing: "-0.02em",
              color:       "#f97316",
              lineHeight:  1,
            }}
          >
            APROVAI
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
