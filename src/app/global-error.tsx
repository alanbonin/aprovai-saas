"use client";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error envolve o layout raiz — não tem acesso ao layout normal.
// Por isso usa HTML/CSS puro.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      console.error("[AprovAI360 GlobalError]", error.digest, error.message);
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#080c18", fontFamily: "Inter, sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}>
          <div>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 32,
            }}>⚠️</div>

            <h1 style={{ color: "white", fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
              Erro crítico
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
              O sistema encontrou um problema grave. Por favor, recarregue a página.
            </p>
            {error.digest && (
              <p style={{ color: "#4b5563", fontSize: 12, fontFamily: "monospace", marginBottom: 24 }}>
                {error.digest}
              </p>
            )}

            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
