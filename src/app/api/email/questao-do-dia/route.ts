import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

/**
 * GET /api/email/questao-do-dia
 * Cron diário às 8h UTC: envia a questão do dia por email para alunos ativos
 * com assinatura ativa que tenham respondido pelo menos 1 questão nos últimos 30 dias.
 *
 * Usa a mesma seleção determinística de /api/questoes/do-dia (dayOfYear mod total).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.com.br";
const FROM    = process.env.EMAIL_FROM ?? "Aprovai <noreply@aprovai.com.br>";

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

function levelLabel(level: string): string {
  return level === "facil" ? "🟢 Fácil" : level === "medio" ? "🟡 Médio" : "🔴 Difícil";
}

function buildHtml({
  name,
  question,
}: {
  name: string;
  question: { id: number; statement: string; banca: string | null; year: number | null; level: string; answer: string; explanation: string | null };
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Questão do Dia</title></head>
<body style="margin:0;padding:0;background:#080c18;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">
  <!-- Logo -->
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:10px 18px;">
      <span style="font-size:20px;">🎯</span>
      <span style="color:#a5b4fc;font-weight:700;font-size:16px;">Questão do Dia — Aprovai</span>
    </div>
  </div>

  <!-- Header -->
  <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">
    <p style="color:#94a3b8;font-size:14px;margin:0 0 6px;">Olá, <strong style="color:#e8eaf0;">${name.split(" ")[0]}</strong>!</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0;line-height:1.6;">
      Chegou a sua <strong style="color:#818cf8;">Questão do Dia</strong>. Teste seus conhecimentos e mantenha o ritmo de estudos!
    </p>
  </div>

  <!-- Question -->
  <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      ${question.banca ? `<span style="font-size:11px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:3px 10px;color:#818cf8;">${question.banca}${question.year ? ` · ${question.year}` : ""}</span>` : ""}
      <span style="font-size:11px;color:#6b7280;">${levelLabel(question.level)}</span>
    </div>
    <p style="color:#e2e8f0;font-size:14px;line-height:1.8;margin:0 0 20px;">${question.statement}</p>
    <p style="color:#6b7280;font-size:12px;margin:0;">
      👆 Pense na resposta antes de clicar no botão abaixo!
    </p>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:20px;">
    <a href="${APP_URL}/dashboard?questao=${question.id}"
       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
      Responder agora →
    </a>
  </div>

  <!-- Spoiler: Gabarito -->
  <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:16px;margin-bottom:24px;">
    <p style="color:#6b7280;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Gabarito</p>
    <p style="color:#34d399;font-size:22px;font-weight:900;margin:0;">Alternativa ${question.answer}</p>
    ${question.explanation ? `<p style="color:#94a3b8;font-size:12px;margin:8px 0 0;line-height:1.6;">${question.explanation}</p>` : ""}
  </div>

  <!-- Footer -->
  <div style="text-align:center;">
    <p style="color:#374151;font-size:11px;">
      Você recebe este email porque está inscrito no Aprovai.<br>
      <a href="${APP_URL}/workspace" style="color:#6366f1;text-decoration:none;">Acesse o Workspace</a> ·
      <a href="${APP_URL}/ranking" style="color:#6366f1;text-decoration:none;">Ver Ranking</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

async function runCron() {
  const resend = getResend();
  const now = new Date();

  // Seleção determinística da questão do dia
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

  const { count } = await db.from("Question").select("id", { count: "exact", head: true });
  if (!count || count === 0) return { skipped: "Nenhuma questão no banco" };

  const offset = dayOfYear % count;
  const { data: rows } = await db.from("Question").select("*").order("id").range(offset, offset);
  const question = rows?.[0];
  if (!question) return { skipped: "Questão do dia não encontrada" };

  // Busca alunos ativos nos últimos 30 dias (com assinatura ativa)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subs } = await db
    .from("Subscription")
    .select("userId")
    .eq("status", "ACTIVE");

  const rawUserIds = (subs ?? []).map(s => s.userId);
  if (rawUserIds.length === 0) return { sent: 0, skipped: 0 };

  const { filterByEmailPref } = await import("@/lib/email-prefs");
  const activeUserIds = await filterByEmailPref(rawUserIds, "emailQuestaoDodia");
  if (activeUserIds.length === 0) return { sent: 0, skipped: 0 };

  // Filtra quem respondeu pelo menos 1 questão nos últimos 30 dias
  const { data: recentActivity } = await db
    .from("Progress")
    .select("userId")
    .in("userId", activeUserIds)
    .gte("createdAt", thirtyDaysAgo);

  const activeSet = new Set((recentActivity ?? []).map(p => p.userId));
  const targetIds = activeUserIds.filter(id => activeSet.has(id));

  if (targetIds.length === 0) return { sent: 0, skipped: activeUserIds.length };

  // Busca emails
  const { data: users } = await db
    .from("User")
    .select("id, name, email")
    .in("id", targetIds);

  let sent = 0;
  let skipped = 0;

  for (const u of users ?? []) {
    if (!u.email) { skipped++; continue; }
    try {
      await resend.emails.send({
        from: FROM,
        to: u.email,
        subject: `🎯 Questão do Dia — ${now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}`,
        html: buildHtml({ name: u.name ?? "Aluno", question }),
      });
      sent++;
    } catch {
      skipped++;
    }
  }

  return { sent, skipped, questionId: question.id };
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await runCron());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await runCron());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
