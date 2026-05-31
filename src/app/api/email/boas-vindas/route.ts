import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { log } from "@/lib/logger";
import { getEmailTemplate, renderTemplate } from "@/lib/email-templates";

// ── Email de boas-vindas enviado após registro do usuário ─────────────────────
// Chamado internamente por /api/auth/register após criar o User no banco.

function buildBoasVindasHtml({ name, appUrl }: { name: string; appUrl: string }): string {
  const firstName = name.split(" ")[0] ?? name;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao Aprovai!</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #111827; border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 40px; }
    .logo { font-size: 22px; font-weight: 900; color: #6366f1; letter-spacing: -0.5px; margin-bottom: 32px; }
    h1 { font-size: 24px; font-weight: 800; color: #f8fafc; margin: 0 0 12px; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
    .highlight { color: #f8fafc; font-weight: 600; }
    .cta { display: inline-block; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; margin: 24px 0; }
    .features { margin: 28px 0; padding: 0; list-style: none; }
    .features li { font-size: 14px; color: #94a3b8; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .features li:last-child { border-bottom: none; }
    .features span { color: #6366f1; margin-right: 8px; font-weight: 700; }
    .footer { margin-top: 32px; font-size: 12px; color: #4b5563; text-align: center; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">🎓 APROVAI</div>
      <h1>Bem-vindo, ${firstName}! 🚀</h1>
      <p>Seu período de <span class="highlight">7 dias grátis</span> começou agora. Você tem acesso completo à plataforma para turbinar seus estudos para concursos.</p>

      <ul class="features">
        <li><span>✓</span> Mentor IA especializado em concursos públicos</li>
        <li><span>✓</span> Questões adaptativas com revisão espaçada</li>
        <li><span>✓</span> Flashcards gerados com inteligência artificial</li>
        <li><span>✓</span> Simulados no estilo da sua banca</li>
        <li><span>✓</span> Cronograma adaptativo semanal</li>
        <li><span>✓</span> Diagnóstico de desempenho com IA</li>
      </ul>

      <p>O primeiro passo é completar seu perfil e selecionar suas matérias. Em menos de 2 minutos, a IA monta seu plano de estudos personalizado.</p>

      <a href="${appUrl}/workspace?welcome=1" class="cta">Começar a estudar →</a>

      <p style="font-size: 13px; margin-top: 8px;">
        Aproveite os 7 dias de trial para explorar tudo. Caso queira continuar, nossos planos partem de R$ 69/mês.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Aprovai — Sua aprovação começa aqui.</p>
      <p><a href="${appUrl}/workspace/perfil">Gerenciar preferências de e-mail</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Chamado internamente (sem autenticação de usuário — usa SERVICE_ROLE)
export async function POST(req: Request) {
  // Validação básica via secret interno para evitar uso externo
  const authHeader = req.headers.get("authorization");
  const internalSecret = process.env.CRON_SECRET;
  if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { userId, email, name } = await req.json() as { userId?: string; email?: string; name?: string };
  if (!userId || !email || !name) {
    return NextResponse.json({ error: "userId, email e name são obrigatórios" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.app";

  // Envia e-mail de boas-vindas
  let emailOk = false;
  try {
    const template = await getEmailTemplate("boas-vindas");
    const { assunto, html: htmlRendered } = renderTemplate(template, {
      nome: name.split(" ")[0] ?? name,
      app_url: appUrl,
    });
    const { error } = await sendEmail({
      to: email,
      subject: assunto,
      html: htmlRendered,
    });
    if (error) throw error;
    emailOk = true;
  } catch (err) {
    log.error("email.boas_vindas_send_error", {}, err);
  }

  // Ativa o Trial automaticamente se o usuário ainda não tem assinatura
  let trialActivated = false;
  try {
    const { data: existingSub } = await db
      .from("Subscription")
      .select("id")
      .eq("userId", userId)
      .maybeSingle();

    if (!existingSub) {
      const { data: trialPlan } = await db
        .from("Plan")
        .select("id, intervalDays")
        .eq("slug", "trial")
        .eq("active", true)
        .maybeSingle();

      if (trialPlan) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + (trialPlan.intervalDays ?? 7));
        await db.from("Subscription").insert({
          id: crypto.randomUUID(),
          userId,
          planId: trialPlan.id,
          status: "ACTIVE",
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        trialActivated = true;
      }
    }
  } catch (err) {
    log.error("email.boas_vindas_trial_error", {}, err);
  }

  return NextResponse.json({ emailOk, trialActivated });
}
