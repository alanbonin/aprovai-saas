import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const ALLOWED_CRONS = [
  "/api/email/lembrete",
  "/api/email/relatorio-semanal",
  "/api/email/reativacao",
  "/api/email/questao-do-dia",
  "/api/email/trial-expirando",
  "/api/cron/streak",
  "/api/cron/expirar-assinaturas",
];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// POST /api/admin/run-cron — { cronPath } — dispara um cron manualmente
export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let body: { cronPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { cronPath } = body;
  if (!cronPath) return NextResponse.json({ error: "cronPath é obrigatório" }, { status: 400 });

  if (!ALLOWED_CRONS.includes(cronPath)) {
    return NextResponse.json({ error: "Cron não permitido" }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.com.br";
  const targetUrl = `${baseUrl}${cronPath}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      cronPath,
      result: data,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao executar cron",
    }, { status: 500 });
  }
}
