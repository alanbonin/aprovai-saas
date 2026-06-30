import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { signupLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { log, LogEvent, mask } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RegisterSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
});

async function sendBoasVindas(userId: string, email: string, name: string) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.CRON_SECRET ?? "";
    await fetch(`${appUrl}/api/email/boas-vindas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ userId, email, name }),
    });
  } catch {
    // Não bloqueia o registro se o email falhar
  }
}

async function notifyAdminNewUser(name: string, email: string) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.CRON_SECRET ?? "";
    await fetch(`${appUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        adminOnly: true,
        title: "🎉 Novo cadastro!",
        body: `${name} (${email}) acabou de criar uma conta.`,
        url: `${appUrl}/admin/alunos`,
      }),
    });
  } catch {
    // Não bloqueia o registro se o push falhar
  }
}

async function sendConfirmacaoEmail(email: string, name: string, confirmUrl: string) {
  const { error } = await sendEmail({
    to: email,
    subject: "Confirme seu e-mail — AprovAI360",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">Olá, ${name}!</h2>
        <p style="color:#555;margin-bottom:8px">
          Bem-vindo(a) ao AprovAI360! Para ativar sua conta, confirme seu e-mail clicando no botão abaixo.
        </p>
        <p style="color:#888;font-size:13px;margin-bottom:24px">
          Seu trial de 7 dias começa agora. Não perca tempo!
        </p>
        <a href="${confirmUrl}"
          style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Confirmar e-mail
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Este link expira em 24 horas. Se você não criou uma conta, ignore este e-mail.
        </p>
      </div>
    `,
  });
  if (error) throw error;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await signupLimiter.check(`signup:${ip}`);
  if (!rl.ok) {
    log.security(LogEvent.AUTH_RATE_LIMITED, { ip: mask.ip(ip), endpoint: "/api/auth/register" });
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const body = await req.json();
  const parseResult = RegisterSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
  }
  const { name, email, password } = parseResult.data;

  // Cria usuário no Supabase Auth via admin SDK — não envia nenhum email pelo Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
  });

  if (authError || !authData?.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado. Tente fazer login." }, { status: 409 });
    }
    log.error(LogEvent.AUTH_ERROR, { email: mask.email(email) }, authError);
    return NextResponse.json({ error: "Erro ao criar conta. Tente novamente." }, { status: 500 });
  }

  const supabaseId = authData.user.id;
  const now = new Date().toISOString();

  // Verifica se já existe registro no banco (re-tentativas)
  const { data: existing } = await db.from("User").select("id").eq("supabaseId", supabaseId).single();

  let dbUserId: string;
  if (existing) {
    await db.from("User").update({ name, email, updatedAt: now }).eq("id", existing.id);
    dbUserId = existing.id;
  } else {
    const { data, error: dbError } = await db.from("User").insert({
      id: crypto.randomUUID(),
      supabaseId,
      name,
      email,
      role: "STUDENT",
      origin: "platform",
      createdAt: now,
      updatedAt: now,
    }).select("id").single();

    if (dbError || !data) {
      log.error(LogEvent.DB_ERROR, { table: "User", op: "insert" }, dbError);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
    dbUserId = data.id;

    // Ativa Trial de 7 dias
    const { data: trialPlan } = await db
      .from("Plan")
      .select("id")
      .eq("slug", "trial")
      .eq("active", true)
      .maybeSingle();

    if (trialPlan) {
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await db.from("Subscription").insert({
        id: crypto.randomUUID(),
        userId: dbUserId,
        planId: trialPlan.id,
        status: "ACTIVE",
        startDate: now,
        endDate: trialEnd,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Gera link de confirmação via admin SDK — token OTP, sem PKCE
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai360.com.br";
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    options: { redirectTo: `${appUrl}/workspace` },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    // Conta criada mas não conseguimos enviar o email — retorna erro para o usuário tentar de novo
    log.error(LogEvent.AUTH_ERROR, { email: mask.email(email), step: "generateLink" }, linkError);
    return NextResponse.json({ error: "Conta criada, mas erro ao enviar e-mail de confirmação. Contate o suporte." }, { status: 500 });
  }

  const confirmUrl = `${appUrl}/confirmar-email?token_hash=${linkData.properties.hashed_token}&type=signup`;

  try {
    await sendConfirmacaoEmail(email, name, confirmUrl);
  } catch (emailErr) {
    log.error(LogEvent.AUTH_ERROR, { email: mask.email(email), step: "sendEmail" }, emailErr);
    return NextResponse.json({ error: "Erro ao enviar e-mail de confirmação. Verifique o endereço e tente novamente." }, { status: 500 });
  }

  log.info(LogEvent.AUTH_REGISTER, { email: mask.email(email) });
  void notifyAdminNewUser(name, email);
  // Boas-vindas enviadas após confirmação — aqui apenas notificamos o admin
  // void sendBoasVindas(dbUserId, email, name); // comentado: enviar após confirmação

  return NextResponse.json({ ok: true });
}
