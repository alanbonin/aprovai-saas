import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/health — endpoint de monitoramento para Vercel, UptimeRobot, etc.
export async function GET() {
  const start = Date.now();

  // Teste simples de conexão ao banco
  let dbOk = false;
  let dbMs = 0;
  try {
    const t0 = Date.now();
    await db.from("Plan").select("id").limit(1);
    dbMs = Date.now() - t0;
    dbOk = true;
  } catch { /* db down */ }

  const status = dbOk ? "ok" : "degraded";
  const totalMs = Date.now() - start;

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      latencyMs: totalMs,
      checks: {
        database: { ok: dbOk, latencyMs: dbMs },
        anthropicKey: { ok: !!process.env.ANTHROPIC_API_KEY },
        resendKey: { ok: !!process.env.RESEND_API_KEY },
        mercadopagoKey: { ok: !!process.env.MERCADOPAGO_ACCESS_TOKEN },
        vapidKeys: { ok: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) },
      },
    },
    { status: dbOk ? 200 : 503 }
  );
}
