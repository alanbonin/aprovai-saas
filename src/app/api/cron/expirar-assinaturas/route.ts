import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { log, LogEvent } from "@/lib/logger";

/**
 * GET /api/cron/expirar-assinaturas
 *
 * Executado diariamente via Vercel Cron (schedule: "0 6 * * *").
 * Responsabilidades:
 *  1. Marca como EXPIRED assinaturas ACTIVE com endDate no passado
 *  2. Envia e-mail de aviso para usuários cujo trial vence em 1 dia
 *  3. Envia e-mail de expiração para quem acabou de expirar
 */

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // dev: sem secret, aceita; prod: nega
  return req.headers.get("authorization") === `Bearer ${secret}`;
}


function buildExpiradoHtml(name: string, appUrl: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><style>
body{margin:0;padding:0;background:#0a0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.c{max-width:560px;margin:0 auto;padding:40px 20px}
.card{background:#111827;border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:40px}
.logo{font-size:20px;font-weight:900;color:#6366f1;margin-bottom:28px}
h1{font-size:22px;font-weight:800;color:#f8fafc;margin:0 0 12px}
p{font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 14px}
.cta{display:inline-block;background:#6366f1;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:12px;font-size:14px;font-weight:700;margin:20px 0}
.box{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px 20px;margin:20px 0}
.footer{margin-top:28px;font-size:11px;color:#4b5563;text-align:center}
.footer a{color:#6366f1;text-decoration:none}
</style></head>
<body><div class="c"><div class="card">
<div class="logo">🎓 APROVAI</div>
<h1>Seu trial expirou, ${firstName} ⏰</h1>
<p>Seu período gratuito de 7 dias chegou ao fim. Não perca o ritmo dos estudos!</p>
<div class="box">
<p style="margin:0;color:#fbbf24;font-size:13px">📊 Você usou a plataforma durante seu trial. Continue com um plano para não perder seu histórico de progresso, flashcards e simulados.</p>
</div>
<p>Escolha o plano ideal para sua preparação:</p>
<ul style="list-style:none;padding:0;margin:0 0 20px">
<li style="font-size:13px;color:#94a3b8;padding:4px 0">⚡ <strong style="color:#f8fafc">Focado</strong> — R$ 69/mês · 1 concurso, 80 msgs/semana</li>
<li style="font-size:13px;color:#94a3b8;padding:4px 0">🏆 <strong style="color:#f8fafc">Aprovação</strong> — R$ 99/mês · 2 concursos, 300 msgs/semana</li>
<li style="font-size:13px;color:#94a3b8;padding:4px 0">🚀 <strong style="color:#f8fafc">Elite</strong> — R$ 149,90/mês · ilimitado</li>
</ul>
<a href="${appUrl}/planos" class="cta">Ver planos e assinar →</a>
</div>
<div class="footer">
<p>© ${new Date().getFullYear()} Aprovai · <a href="${appUrl}/workspace/perfil">Gerenciar e-mails</a></p>
</div></div></div></body></html>`;
}

function buildAvisoHtml(name: string, appUrl: string, horasRestantes: number): string {
  const firstName = name.split(" ")[0];
  const diasLabel = horasRestantes <= 24 ? "menos de 1 dia" : `${Math.ceil(horasRestantes / 24)} dias`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><style>
body{margin:0;padding:0;background:#0a0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.c{max-width:560px;margin:0 auto;padding:40px 20px}
.card{background:#111827;border:1px solid rgba(99,102,241,0.25);border-radius:20px;padding:40px}
.logo{font-size:20px;font-weight:900;color:#6366f1;margin-bottom:28px}
h1{font-size:22px;font-weight:800;color:#f8fafc;margin:0 0 12px}
p{font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 14px}
.cta{display:inline-block;background:#6366f1;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:12px;font-size:14px;font-weight:700;margin:20px 0}
.badge{display:inline-block;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:20px;padding:4px 12px;font-size:12px;color:#f87171;font-weight:600;margin-bottom:16px}
.footer{margin-top:28px;font-size:11px;color:#4b5563;text-align:center}
.footer a{color:#6366f1;text-decoration:none}
</style></head>
<body><div class="c"><div class="card">
<div class="logo">🎓 APROVAI</div>
<div class="badge">⚠️ Trial expira em ${diasLabel}</div>
<h1>${firstName}, seu trial está acabando!</h1>
<p>Faltam <strong style="color:#f8fafc">${diasLabel}</strong> para o fim do seu período gratuito. Assine agora para não perder o acesso e continuar sua preparação sem interrupção.</p>
<a href="${appUrl}/planos" class="cta">Assinar agora e continuar →</a>
<p style="font-size:12px;color:#6b7280;margin-top:8px">Planos a partir de R$ 69/mês · cancele quando quiser.</p>
</div>
<div class="footer">
<p>© ${new Date().getFullYear()} Aprovai · <a href="${appUrl}/workspace/perfil">Gerenciar e-mails</a></p>
</div></div></div></body></html>`;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const now = new Date();
  const nowIso = now.toISOString();

  // ── 1. Marca expiradas ───────────────────────────────────────────────────────
  const { data: expiradas, error: errExp } = await db
    .from("Subscription")
    .update({ status: "EXPIRED", updatedAt: nowIso })
    .eq("status", "ACTIVE")
    .lt("endDate", nowIso)
    .select("userId");

  if (errExp) {
    log.error("db.cron_expirar_assinaturas_update", { table: "Subscription" }, errExp);
  }

  const expiradaUserIds = (expiradas ?? []).map((s: { userId: string }) => s.userId);

  // ── 2. Busca usuários que acabaram de expirar ────────────────────────────────
  let expiradoEmailsSent = 0;
  if (expiradaUserIds.length > 0) {
    const { data: users } = await db
      .from("User")
      .select("id, name, email")
      .in("id", expiradaUserIds);

    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.app";
    const from = process.env.EMAIL_FROM ?? "Aprovai <noreply@aprovai.app>";

    for (const user of users ?? []) {
      try {
        // resend migrado para sendEmail via SMTP Titan
        await sendEmail({
          from,
          to: user.email,
          subject: "⏰ Seu trial Aprovai expirou — continue estudando!",
          html: buildExpiradoHtml(user.name ?? user.email, appUrl),
        });
        expiradoEmailsSent++;
      } catch (err) {
        log.error("email.cron_expirado_send_error", {}, err);
      }
    }
  }

  // ── 3. Aviso 1 dia antes da expiração ────────────────────────────────────────
  const amanha = new Date(now);
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStart = new Date(amanha);
  amanhaStart.setHours(0, 0, 0, 0);
  const amanhaEnd = new Date(amanha);
  amanhaEnd.setHours(23, 59, 59, 999);

  const { data: vencendoAmanha } = await db
    .from("Subscription")
    .select("userId, endDate, Plan(slug)")
    .eq("status", "ACTIVE")
    .gte("endDate", amanhaStart.toISOString())
    .lte("endDate", amanhaEnd.toISOString());

  let avisoEmailsSent = 0;
  if ((vencendoAmanha ?? []).length > 0) {
    type SubRow = { userId: string; endDate: string; Plan: { slug: string } | { slug: string }[] | null };
    const trialVencendo = (vencendoAmanha as SubRow[]).filter(s => {
      const plan = Array.isArray(s.Plan) ? s.Plan[0] : s.Plan;
      return plan?.slug === "trial";
    });

    if (trialVencendo.length > 0) {
      const trialUserIds = trialVencendo.map(s => s.userId);
      const { data: trialUsers } = await db
        .from("User")
        .select("id, name, email")
        .in("id", trialUserIds);

      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.app";
      const from = process.env.EMAIL_FROM ?? "Aprovai <noreply@aprovai.app>";

      for (const user of trialUsers ?? []) {
        const sub = trialVencendo.find(s => s.userId === user.id);
        const horasRestantes = sub
          ? (new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60)
          : 24;
        try {
          // resend migrado para sendEmail via SMTP Titan
          await sendEmail({
            from,
            to: user.email,
            subject: "⚠️ Seu trial Aprovai expira amanhã — não perca o acesso!",
            html: buildAvisoHtml(user.name ?? user.email, appUrl, horasRestantes),
          });
          avisoEmailsSent++;
        } catch (err) {
          log.error("email.cron_aviso_expiracao_send_error", {}, err);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    expiradas: expiradaUserIds.length,
    expiradoEmailsSent,
    avisoEmailsSent,
    checkedAt: nowIso,
  });
}
