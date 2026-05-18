import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get("title") ?? "AprovAI360"
  const subtitle = searchParams.get("subtitle") ?? "Sua Aprovação em Concursos Públicos"

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #080c18 0%, #0d1b2a 50%, #0a1628 100%)",
        fontFamily: "sans-serif",
      }}>
        {/* Logo sphere */}
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #0ab5bd, #066d73)",
          marginBottom: 32, boxShadow: "0 0 60px #0ab5bd40",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ color: "white", fontSize: 40, fontWeight: 900 }}>A</div>
        </div>
        {/* Title */}
        <div style={{ fontSize: 64, fontWeight: 900, color: "white", letterSpacing: -2, display: "flex" }}>
          <span>Aprov</span>
          <span style={{ color: "#0ab5bd" }}>AI</span>
          <span>360</span>
        </div>
        {/* Subtitle */}
        <div style={{ fontSize: 28, color: "#94a3b8", marginTop: 16, textAlign: "center", maxWidth: 700, display: "flex" }}>
          {subtitle}
        </div>
        {/* Title param */}
        {title !== "AprovAI360" && (
          <div style={{
            marginTop: 32, padding: "12px 32px",
            background: "#0ab5bd20", borderRadius: 12,
            border: "1px solid #0ab5bd40",
            color: "#0ab5bd", fontSize: 22, display: "flex",
          }}>
            {title}
          </div>
        )}
        {/* URL */}
        <div style={{ position: "absolute", bottom: 32, color: "#475569", fontSize: 18, display: "flex" }}>
          aprovai.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
