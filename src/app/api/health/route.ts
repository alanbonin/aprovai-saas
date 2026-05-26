import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check simples — apenas confirma que a aplicação está respondendo.
 * Detalhes de infraestrutura removidos (não expor URLs, keys ou nodeEnv publicamente).
 */
export async function GET() {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}
