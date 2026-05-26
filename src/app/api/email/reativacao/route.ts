import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

/**
 * GET /api/email/reativacao
 * Cron quinzenal (toda quarta 14h UTC): envia email de reativação para alunos
 * com assinatura ativa que não estudaram nos últimos 7-30 dias.
 *
 * Não envia para quem respondeu questões nos últimos 7 dias (ativos recentemente).
 * Não envia para quem está inativo há mais de 30 dias (sem assinatura provavelmente expirada).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.com.br";
const FROM    = process.env.EMAIL_FROM ?? "Aprovai <noreply@aprovai.com.br>";

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

function buildHtml({
  name,
  diasInativo,
  cargo,
  topSubject,
  totalQuestoes,
}: {
  name: string;
  diasInativo: number;
  cargo: string | null;
  topSubject: string | null;
  totalQuestoes: number;
}) {
  const firstNome = name.split(" ")[0];
  const motivacoes = [
    "A aprovação não acontece sozinha — cada dia importa.",
    "Você já estudou tanto! Não deixe o progresso esfriar.",
    "Seus concorrentes não pararam. Que tal retomar hoje?",
    "Um passo de cada vez. Responda só 5 questões hoje.",
    "O segredo dos aprovados: consistência. Volte agora.",
  ];
  const motivacao = motivacoes[diasInativo % motivacoes.length];

  const dica = topSubject
    ? `Continue de onde parou — você tem questões de <strong>${topSubject}</strong> para revisar.`
    : "Abra o workspace e responda pelo menos 5 questões hoje para manter sua sequência.";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="background:#080c18;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:540px;margin:40px auto;padding:0 20px">
    <div style="background:#0f1523;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1040 0%,#0f1523 100%);padding:32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:44px;margin-bottom:12px">😴</div>
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 6px">${firstNome}, sentimos sua falta!</h1>
        <p style="color:#8b5cf6;font-size:13px;margin:0">
          Você não estuda há <strong>${diasInativo} dia${diasInativo !== 1 ? "s" : ""}</strong>
          ${cargo ? ` — e sua prova de <strong>${cargo}</strong> está chegando` : ""}
        </p>
      </div>

      <!-- Corpo -->
      <div style="padding:28px 32px">
        <!-- Motivação -->
        <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:16px;margin-bottom:24px">
          <p style="color:#c4b5fd;font-size:14px;margin:0;line-height:1.6;font-style:italic">"${motivacao}"</p>
        </div>

        <!-- O que está esperando por você -->
        <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">O que te espera no Aprovai</p>
        <ul style="margin:0;padding:0;list-style:none">
          ${[
            `📚 <strong>${totalQuestoes > 0 ? `${totalQuestoes}+ questões` : "Banco de questões"}</strong> organizadas por matéria e banca`,
            `🤖 <strong>Mentor IA</strong> que explica cada erro no seu ritmo`,
            `🃏 <strong>Flashcards com revisão espaçada</strong> para memorização eficiente`,
            `📊 <strong>Relatório de desempenho</strong> para saber onde melhorar`,
          ].map(item => `
          <li style="color:#e2e8f0;font-size:13px;margin-bottom:10px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px">
            ${item}
          </li>`).join("")}
        </ul>

        <!-- Dica personalizada -->
        <div style="margin:20px 0;padding:16px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:12px">
          <p style="color:#a5b4fc;font-size:13px;margin:0;line-height:1.6">💡 ${dica}</p>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-top:24px">
          <a href="${APP_URL}/workspace"
             style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;text-decoration:none;padding:15px 36px;border-radius:14px;font-weight:700;font-size:15px;box-shadow:0 4px 20px rgba(99,102,241,0.4)">
            Retomar estudos agora →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
        <p style="color:#374151;font-size:11px;margin:0">
          Aprovai · Você está recebendo porque tem uma assinatura ativa
          <br><a href="${APP_URL}/workspace" style="color:#374151;text-decoration:none">Cancelar emails</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

async function runCron() {
  const resend = getResend();
  const now = new Date();

  // Janela de inatividade: 7-30 dias atrás
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Alunos com assinatura ativa
  const { data: subscriptions } = await db
    .from("Subscription")
    .select("userId")
    .eq("status", "ACTIVE")
    .gte("endDate", now.toISOString());

  if (!subscriptions?.length) return { sent: 0, skipped: 0 };

  const allUserIds = subscriptions.map(s => s.userId);
  // Filtra quem optou por não receber emails de reativação
  const { filterByEmailPref } = await import("@/lib/email-prefs");
  const userIds = await filterByEmailPref(allUserIds, "emailReativacao");

  // Alunos que estudaram nos últimos 7 dias — excluir
  const { data: recentes } = await db
    .from("Progress")
    .select("userId")
    .in("userId", userIds)
    .gte("createdAt", sevenDaysAgo);
  const recenteIds = new Set((recentes ?? []).map(r => r.userId));

  // Alunos que estudaram entre 7 e 30 dias atrás (inativos recentes)
  const { data: inativos } = await db
    .from("Progress")
    .select("userId")
    .in("userId", userIds)
    .gte("createdAt", thirtyDaysAgo)
    .lt("createdAt", sevenDaysAgo);
  const inativoIds = [...new Set((inativos ?? []).map(r => r.userId))]
    .filter(id => !recenteIds.has(id));

  if (inativoIds.length === 0) return { sent: 0, skipped: userIds.length };

  const { data: users } = await db
    .from("User")
    .select("id, name, email")
    .in("id", inativoIds);

  if (!users?.length) return { sent: 0, skipped: userIds.length };

  let sent = 0; let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Última atividade
      const { data: ultimaAtividade } = await db
        .from("Progress")
        .select("createdAt")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(1)
        .single();

      const diasInativo = ultimaAtividade?.createdAt
        ? Math.ceil((now.getTime() - new Date(ultimaAtividade.createdAt).getTime()) / 86400000)
        : 14;

      // Total de questões respondidas (para mostrar progresso)
      const { count: totalQuestoes } = await db
        .from("Progress")
        .select("*", { count: "exact", head: true })
        .eq("userId", user.id) as unknown as { count: number };

      // Matéria mais praticada
      const { data: profile } = await db
        .from("StudentProfile")
        .select("cargo")
        .eq("userId", user.id)
        .single();

      // Matéria mais respondida
      const { data: progrBySubject } = await db
        .from("Progress")
        .select("subjectId")
        .eq("userId", user.id);

      const subjectCount: Record<string, number> = {};
      for (const p of progrBySubject ?? []) {
        if (p.subjectId) subjectCount[p.subjectId] = (subjectCount[p.subjectId] ?? 0) + 1;
      }
      const topSubjectId = Object.entries(subjectCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

      let topSubject: string | null = null;
      if (topSubjectId) {
        const { data: subj } = await db.from("Subject").select("name").eq("id", topSubjectId).single();
        topSubject = subj?.name ?? null;
      }

      const html = buildHtml({
        name: user.name,
        diasInativo,
        cargo: profile?.cargo ?? null,
        topSubject,
        totalQuestoes: totalQuestoes ?? 0,
      });

      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `${user.name.split(" ")[0]}, você está perdendo tempo de estudo ⏰ — Aprovai`,
        html,
      });

      sent++;
    } catch (e) {
      errors.push(`${user.email}: ${String(e)}`);
      skipped++;
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
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
