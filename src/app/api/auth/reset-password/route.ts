import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai360.com.br";

    // Gera link de recuperação via admin SDK — não usa PKCE, retorna token direto no hash
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appUrl}/reset-senha` },
    });

    if (error || !data?.properties?.action_link) {
      // Se o e-mail não existe, retornamos sucesso mesmo assim (segurança)
      return NextResponse.json({ ok: true });
    }

    const actionLink = data.properties.action_link;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "AprovAI360 <contato@aprovai360.com.br>",
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
