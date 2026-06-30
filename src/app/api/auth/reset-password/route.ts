import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sendEmail } from "@/lib/mailer";
import { resetPasswordLimiter } from "@/lib/rate-limit";
import { log, LogEvent } from "@/lib/logger";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ResetSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});

export async function POST(req: Request) {
  // 1. Rate limiting: máximo 3 tentativas por hora por IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await resetPasswordLimiter.check(`reset-pw:${ip}`);
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  // 2. Validação do email
  const body = await req.json().catch(() => ({}));
  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  const { email } = parsed.data;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai360.com.br";

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appUrl}/reset-senha` },
    });

    // Se o e-mail não existe no sistema, retornamos sucesso mesmo assim
    // (evita que alguém descubra quais emails estão cadastrados)
    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ ok: true });
    }

    const actionLink = data.properties.action_link;

    const { error: emailError } = await sendEmail({
      to: email,
      subject: "Redefinição de senha — AprovAI360",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
          <h2 style="color:#1a1a2e;margin-bottom:8px">Redefinir sua senha</h2>
          <p style="color:#555;margin-bottom:24px">
            Recebemos uma solicitação para redefinir a senha da sua conta no AprovAI360.
            Clique no botão abaixo para criar uma nova senha.
          </p>
          <a href="${actionLink}"
            style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
            Redefinir senha
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.
          </p>
        </div>
      `,
    });

    if (emailError) {
      log.error(LogEvent.AUTH_RESET_PW, { step: "sendEmail" }, emailError);
      return NextResponse.json({ error: "Erro ao enviar e-mail. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // 3. Nunca expõe detalhes do erro interno ao browser
    log.error(LogEvent.AUTH_RESET_PW, { step: "unexpected" }, null);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
