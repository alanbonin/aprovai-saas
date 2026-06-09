import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { getEmailTemplate, renderTemplate } from "@/lib/email-templates";
import { getConfig } from "@/lib/system-config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.com.br";

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// Mantida para compatibilidade, mas não é mais usada no envio principal
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildTrialHtml({ name, daysLeft }: { name: string; daysLeft: number }) {
  const isUrgent = daysLeft <= 1;
  const dayLabel = daysLeft === 1 ? "1 dia" : `${daysLeft} dias`;
  const safeName = escapeHtml(name);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#080c18;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:520px;margin:40px auto;padding:0 20px">
    <div style="background:#0f1523;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px">

      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:36px">${isUrgent ? "⚠️" : "⏰"}</span>
        <h1 style="color:#fff;font-size:20px;font-weight:700;margin:10px 0 4px">
          ${safeName}, seu trial expira em ${dayLabel}!
        </h1>
        <p style="color:#6b7280;font-size:13px;margin:0">
          ${isUrgent
            ? "Último dia — não perca seu acesso ao AprovAI."
            : "Aproveite enquanto ainda dá tempo."}
        </p>
      </div>

      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#a5b4fc;font-size:13px;font-weight:600;margin:0 0 12px">
          O que você mantém com um plano pago:
        </p>
        <ul style="margin:0;padding:0;list-style:none">
          <li style="color:#e2e8f0;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            🎮 <strong>Simulados ilimitados</strong> com questões reais de concurso
          </li>
          <li style="color:#e2e8f0;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            🤖 <strong>Mentores IA especializados</strong> por área e banca
          </li>
          <li style="color:#e2e8f0;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            📊 <strong>Relatório completo de desempenho</strong> com prontidão estimada
          </li>
          <li style="color:#e2e8f0;font-size:13px;padding:6px 0">
            🃏 <strong>Flashcards com revisão espaçada</strong> (SM-2) para fixar o conteúdo
          </li>
        </ul>
      </div>

      ${isUrgent ? `
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:12px 16px;margin-bottom:20px;text-align:center">
        <p style="color:#fca5a5;font-size:13px;margin:0;font-weight:600">
          ⚡ Após o trial, seu acesso será limitado ao plano gratuito.
        </p>
      </div>` : ""}

      <a href="${APP_URL}/planos"
        style="display:block;background:#4f46e5;color:#fff;text-align:center;text-decoration:none;padding:15px 24px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.01em">
        Escolher meu plano →
      </a>

      <p style="color:#374151;font-size:11px;text-align:center;margin-top:24px">
        AprovAI · <a href="${APP_URL}/workspace" style="color:#374151">Acessar plataforma</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function runCron() {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const avisarDiasAntes = await getConfig("trial.aviso_dias_antes");
    const plusN = new Date(now.getTime() + (avisarDiasAntes as number) * 86400000).toISOString().slice(0, 10);
    const plus3 = plusN; // alias para compatibilidade com o restante do código

    // Busca assinaturas trial expirando entre hoje e hoje+3 dias
    const { data: subscriptions } = await db
      .from("Subscription")
      .select("userId, endDate")
      .eq("status", "TRIAL")
      .gte("endDate", today)
      .lte("endDate", plus3);

    if (!subscriptions?.length) return { sent: 0, skipped: 0 };

    const userIds = subscriptions.map(s => s.userId as string);
    const { data: users } = await db
      .from("User")
      .select("id, name, email")
      .in("id", userIds);

    if (!users?.length) return { sent: 0, skipped: 0 };

    let sent = 0;
    let skipped = 0;

    for (const sub of subscriptions) {
      const user = users.find(u => u.id === sub.userId);
      if (!user?.email || !user?.name) { skipped++; continue; }

      const endDate = new Date(sub.endDate as string);
      // Dias restantes (ceil para incluir hoje)
      const daysLeft = Math.max(1, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));

      // Só envia para 1 ou 2-3 dias restantes
      if (daysLeft > 3) { skipped++; continue; }

      const firstName = (user.name as string).split(" ")[0];

      try {
        const template = await getEmailTemplate("trial-expirando");
        const { assunto, html } = renderTemplate(template, {
          nome: firstName,
          daysLeft: String(daysLeft),
          planos_url: `${APP_URL}/planos`,
        });

        await sendEmail({
          to: user.email as string,
          subject: assunto,
          html,
        });

        console.info(JSON.stringify({
          level: "info",
          event: "email.trial_expirando",
          userId: user.id,
          daysLeft,
          ts: now.toISOString(),
        }));

        sent++;
      } catch (err) {
        console.error(`email.trial_expirando: falha para ${user.email}`, err);
        skipped++;
      }
    }

    return { sent, skipped };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const result = await runCron();
  if ("error" in result) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const result = await runCron();
  if ("error" in result) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
