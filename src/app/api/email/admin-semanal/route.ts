import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

/**
 * GET /api/email/admin-semanal
 * Cron semanal (segunda 07:00 UTC): envia digest de métricas da plataforma
 * para o e-mail de administração (ADMIN_REPORT_EMAIL ou EMAIL_FROM).
 *
 * Métricas incluídas:
 * - Novos alunos na semana
 * - Total de questões respondidas
 * - Total de simulados realizados
 * - Novas assinaturas
 * - Top 5 alunos mais ativos
 * - Alertas (alunos inativos há 7+ dias)
 */

const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.com.br";
const FROM_EMAIL = process.env.EMAIL_FROM ?? "Aprovai <noreply@aprovai.com.br>";
const ADMIN_EMAIL = process.env.ADMIN_REPORT_EMAIL ?? process.env.EMAIL_FROM ?? "";

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurado");
  return new Resend(key);
}

function getWeekBounds() {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  return { weekStart: weekStart.toISOString(), now: now.toISOString() };
}

function buildHtml(stats: {
  novosAlunos: number;
  totalAlunos: number;
  questoesRespondidas: number;
  simuladosRealizados: number;
  novasAssinaturas: number;
  assinaturasAtivas: number;
  topAlunos: { name: string; email: string; questoes: number }[];
  alunosInativos: number;
  weekLabel: string;
}): string {
  const rows = stats.topAlunos.map((a, i) => `
    <tr>
      <td style="padding:8px 12px;color:#9ca3af;font-size:13px;">${i + 1}º</td>
      <td style="padding:8px 12px;font-size:13px;">${a.name || a.email}</td>
      <td style="padding:8px 12px;font-size:13px;color:#818cf8;font-weight:700;">${a.questoes} questões</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0d1117;font-family:system-ui,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;padding:32px 16px;">
  <tr><td>
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#818cf8;margin:0;">📊 Relatório Semanal</h1>
      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">${stats.weekLabel}</p>
    </div>

    <!-- Stats grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:4px;">
          <div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#818cf8;">${stats.novosAlunos}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Novos alunos</div>
          </div>
        </td>
        <td width="50%" style="padding:4px;">
          <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#10b981;">${stats.questoesRespondidas}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Questões respondidas</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:4px;">
          <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#f59e0b;">${stats.simuladosRealizados}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Simulados</div>
          </div>
        </td>
        <td width="50%" style="padding:4px;">
          <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#8b5cf6;">${stats.novasAssinaturas}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Novas assinaturas</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Summary row -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between;">
      <span style="font-size:13px;color:#9ca3af;">Total de alunos: <strong style="color:#e2e8f0;">${stats.totalAlunos}</strong></span>
      <span style="font-size:13px;color:#9ca3af;">Assinaturas ativas: <strong style="color:#10b981;">${stats.assinaturasAtivas}</strong></span>
    </div>

    ${stats.topAlunos.length > 0 ? `
    <!-- Top alunos -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#818cf8;">🏆 Top 5 — mais ativos esta semana</h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:500;">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:500;">Aluno</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:500;">Questões</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ` : ""}

    ${stats.alunosInativos > 0 ? `
    <!-- Alerta inativos -->
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#ef4444;">⚠️ <strong>${stats.alunosInativos} aluno${stats.alunosInativos > 1 ? "s" : ""}</strong> com assinatura ativa sem atividade há 7+ dias — considere enviar um e-mail de reativação.</p>
    </div>
    ` : ""}

    <div style="text-align:center;">
      <a href="${APP_URL}/admin" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Acessar painel admin →</a>
    </div>

    <p style="font-size:11px;color:#374151;text-align:center;margin-top:24px;">
      Aprovai · Relatório automático semanal · <a href="${APP_URL}" style="color:#6366f1;">aprovai.com.br</a>
    </p>
  </td></tr>
</table>
</body></html>`;
}

async function runCron() {
  if (!ADMIN_EMAIL) return { skipped: true, reason: "ADMIN_REPORT_EMAIL não configurado" };

  const { weekStart, now } = getWeekBounds();

  const [
    { count: novosAlunos },
    { count: totalAlunos },
    { count: questoesRespondidas },
    { count: simuladosRealizados },
    { count: novasAssinaturas },
    { count: assinaturasAtivas },
    { data: progressWeek },
  ] = await Promise.all([
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "STUDENT").gte("createdAt", weekStart),
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
    db.from("Progress").select("*", { count: "exact", head: true }).gte("createdAt", weekStart),
    db.from("SimuladoHistory").select("*", { count: "exact", head: true }).gte("createdAt", weekStart),
    db.from("Subscription").select("*", { count: "exact", head: true }).gte("startDate", weekStart),
    db.from("Subscription").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    db.from("Progress").select("userId").gte("createdAt", weekStart),
  ]);

  // Top 5 mais ativos
  const userCounts: Record<string, number> = {};
  for (const p of progressWeek ?? []) {
    userCounts[p.userId] = (userCounts[p.userId] ?? 0) + 1;
  }
  const topUserIds = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const { data: topUsers } = topUserIds.length
    ? await db.from("User").select("id, name, email").in("id", topUserIds)
    : { data: [] };

  const topAlunos = topUserIds.map(id => {
    const u = (topUsers ?? []).find((u: { id: string }) => u.id === id);
    return { name: u?.name ?? "", email: u?.email ?? "", questoes: userCounts[id] };
  });

  // Alunos inativos com assinatura ativa
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: activeSubs } = await db.from("Subscription")
    .select("userId")
    .eq("status", "ACTIVE");
  const activeSubUserIds = (activeSubs ?? []).map(s => s.userId as string);

  const { data: recentProgress } = activeSubUserIds.length
    ? await db.from("Progress").select("userId").in("userId", activeSubUserIds).gte("createdAt", sevenDaysAgo)
    : { data: [] };
  const activeUserIds = new Set((recentProgress ?? []).map(p => p.userId));
  const alunosInativos = activeSubUserIds.filter(id => !activeUserIds.has(id)).length;

  const weekLabel = new Date(weekStart).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) +
    " – " + new Date(now).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const html = buildHtml({
    novosAlunos: novosAlunos ?? 0,
    totalAlunos: totalAlunos ?? 0,
    questoesRespondidas: questoesRespondidas ?? 0,
    simuladosRealizados: simuladosRealizados ?? 0,
    novasAssinaturas: novasAssinaturas ?? 0,
    assinaturasAtivas: assinaturasAtivas ?? 0,
    topAlunos,
    alunosInativos,
    weekLabel,
  });

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `📊 Relatório Semanal Aprovai — ${weekLabel}`,
    html,
  });

  if (error) return { error: error.message };
  return { sent: true, to: ADMIN_EMAIL, weekLabel };
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
