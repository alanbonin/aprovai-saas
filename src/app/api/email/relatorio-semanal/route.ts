import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

/**
 * GET /api/email/relatorio-semanal
 * Cron semanal (domingo 20h BRT = segunda 00h UTC): envia resumo de desempenho
 * da semana para cada aluno ativo com pelo menos 1 questão respondida.
 *
 * Também pode ser chamado via POST com Authorization: Bearer CRON_SECRET para
 * envio manual ou testes.
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

function getWeekBounds() {
  const now = new Date();
  const end = new Date(now);
  // começo = 7 dias atrás às 00:00 UTC
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildHtml({
  name,
  questoes,
  acertos,
  flashcardsRevisados,
  streak,
  topSubject,
  piorSubject,
}: {
  name: string;
  questoes: number;
  acertos: number;
  flashcardsRevisados: number;
  streak: number;
  topSubject: string | null;
  piorSubject: string | null;
}) {
  const accuracy = questoes > 0 ? Math.round((acertos / questoes) * 100) : 0;
  const acuracyColor = accuracy >= 70 ? "#10b981" : accuracy >= 50 ? "#f59e0b" : "#ef4444";
  const firstNome = name.split(" ")[0];

  const highlights: string[] = [];
  if (questoes > 0) highlights.push(`🎯 <strong>${questoes} questões</strong> respondidas — <strong style="color:${acuracyColor}">${accuracy}% de acerto</strong>`);
  if (flashcardsRevisados > 0) highlights.push(`🃏 <strong>${flashcardsRevisados} flashcard${flashcardsRevisados > 1 ? "s" : ""}</strong> revisado${flashcardsRevisados > 1 ? "s" : ""}`);
  if (streak > 0) highlights.push(`🔥 Sequência atual de <strong>${streak} dia${streak > 1 ? "s"  : ""}</strong>`);
  if (topSubject) highlights.push(`⭐ Melhor matéria: <strong>${topSubject}</strong>`);
  if (piorSubject) highlights.push(`⚠️ Atenção especial: <strong>${piorSubject}</strong>`);

  if (highlights.length === 0) {
    highlights.push("📚 Ainda não há atividades registradas essa semana — que tal começar agora?");
  }

  const motivacao = accuracy >= 80
    ? "Excelente semana! Continue assim e a aprovação está chegando. 🚀"
    : accuracy >= 60
    ? "Bom ritmo! Manter a consistência é o segredo da aprovação."
    : questoes > 0
    ? "Cada questão respondida é um passo a mais rumo à aprovação. Você está no caminho certo!"
    : "Uma nova semana começa. Reserve pelo menos 30 min de estudo hoje — você vai se surpreender.";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Seu Resumo Semanal — Aprovai</title>
</head>
<body style="background:#080c18;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="background:#0f1523;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e1b4b 0%,#0f1523 100%);padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:40px;margin-bottom:12px">📊</div>
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px">Seu Resumo da Semana</h1>
        <p style="color:#818cf8;font-size:13px;margin:0">Olá, ${firstNome}! Veja como foi sua semana de estudos</p>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:28px;font-weight:900;color:#6366f1;line-height:1">${questoes}</div>
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px">Questões</div>
        </div>
        <div style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:28px;font-weight:900;color:${acuracyColor};line-height:1">${accuracy}%</div>
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px">Acerto</div>
        </div>
        <div style="padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:900;color:#f59e0b;line-height:1">${streak}</div>
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px">Streak (dias)</div>
        </div>
      </div>

      <!-- Highlights -->
      <div style="padding:24px 32px">
        <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Esta semana</p>
        <ul style="margin:0;padding:0;list-style:none;space-y:8px">
          ${highlights.map(h => `
          <li style="color:#e2e8f0;font-size:14px;margin-bottom:10px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px">
            ${h}
          </li>`).join("")}
        </ul>
      </div>

      <!-- Motivação -->
      <div style="margin:0 32px 24px;padding:16px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:12px">
        <p style="color:#a5b4fc;font-size:13px;margin:0;line-height:1.6">${motivacao}</p>
      </div>

      <!-- CTA -->
      <div style="padding:0 32px 32px;text-align:center">
        <a href="${APP_URL}/workspace"
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px">
          Continuar estudando →
        </a>
        <p style="color:#374151;font-size:11px;margin-top:20px">
          Aprovai · <a href="${APP_URL}/workspace" style="color:#374151;text-decoration:none">Ver relatório completo</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

async function runCron() {
  const resend = getResend();
  const { start, end } = getWeekBounds();

  // Busca usuários com assinatura ativa
  const { data: subscriptions } = await db
    .from("Subscription")
    .select("userId")
    .eq("status", "ACTIVE")
    .gte("endDate", new Date().toISOString());

  if (!subscriptions?.length) return { sent: 0, skipped: 0 };

  const allUserIds = subscriptions.map(s => s.userId);
  const { filterByEmailPref } = await import("@/lib/email-prefs");
  const userIds = await filterByEmailPref(allUserIds, "emailRelatorioSemanal");
  const { data: users } = await db
    .from("User").select("id, name, email").in("id", userIds);
  if (!users?.length) return { sent: 0, skipped: 0 };

  let sent = 0; let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Questões da semana
      const { data: progresso } = await db
        .from("Progress")
        .select("correct, subjectId")
        .eq("userId", user.id)
        .gte("createdAt", start)
        .lte("createdAt", end);

      const questoes = progresso?.length ?? 0;

      // Só envia se respondeu pelo menos 1 questão na semana
      if (questoes === 0) { skipped++; continue; }

      const acertos = (progresso ?? []).filter(p => p.correct).length;

      // Flashcards revisados (FlashcardSet updatedAt na semana)
      const { data: sets } = await db
        .from("FlashcardSet")
        .select("cards")
        .eq("userId", user.id)
        .gte("updatedAt", start)
        .lte("updatedAt", end);

      let flashcardsRevisados = 0;
      for (const s of sets ?? []) {
        const cards = Array.isArray(s.cards) ? s.cards : [];
        // conta cards que têm lastReview na semana
        for (const c of cards as { lastReview?: string }[]) {
          if (c.lastReview && c.lastReview >= start && c.lastReview <= end) flashcardsRevisados++;
        }
      }

      // Streak (do StudentProfile ou fallback dias consecutivos de Progress)
      const { data: profile } = await db
        .from("StudentProfile")
        .select("streak")
        .eq("userId", user.id)
        .single();
      const streak = profile?.streak ?? 0;

      // Melhor e pior matéria
      const subjectAcc: Record<string, { correct: number; total: number; name?: string }> = {};
      for (const p of progresso ?? []) {
        if (!p.subjectId) continue;
        if (!subjectAcc[p.subjectId]) subjectAcc[p.subjectId] = { correct: 0, total: 0 };
        subjectAcc[p.subjectId].total++;
        if (p.correct) subjectAcc[p.subjectId].correct++;
      }

      const subjectIds = Object.keys(subjectAcc).filter(id => subjectAcc[id].total >= 3);
      if (subjectIds.length > 0) {
        const { data: subjs } = await db.from("Subject").select("id, name").in("id", subjectIds);
        for (const s of subjs ?? []) {
          if (subjectAcc[s.id]) subjectAcc[s.id].name = s.name;
        }
      }

      let topSubject: string | null = null;
      let piorSubject: string | null = null;

      const ranked = Object.values(subjectAcc)
        .filter(s => s.total >= 3 && s.name)
        .map(s => ({ name: s.name!, acc: s.correct / s.total }))
        .sort((a, b) => b.acc - a.acc);

      if (ranked.length > 0) topSubject = ranked[0].name;
      if (ranked.length > 1) piorSubject = ranked[ranked.length - 1].name;

      const html = buildHtml({
        name: user.name,
        questoes,
        acertos,
        flashcardsRevisados,
        streak,
        topSubject,
        piorSubject,
      });

      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `📊 Seu resumo da semana — ${acertos}/${questoes} acertos — Aprovai`,
        html,
      });

      sent++;
    } catch (e) {
      errors.push(`${user.email}: ${String(e)}`);
    }
  }

  return { sent, skipped, errors: errors.length ? errors : undefined };
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
