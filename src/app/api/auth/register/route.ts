import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signupLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const RegisterSchema = z.object({
  supabaseId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
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

export async function POST(req: Request) {
  // Rate limit por IP — protege contra cadastro em massa
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await signupLimiter.check(`signup:${ip}`);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const body = await req.json();
  const parseResult = RegisterSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
  }
  const { supabaseId, name, email } = parseResult.data;

  const now = new Date().toISOString();

  // Verifica se já existe (pode acontecer em re-tentativas)
  const { data: existing } = await db.from("User").select("id").eq("supabaseId", supabaseId).single();

  if (existing) {
    await db.from("User").update({ name, email, updatedAt: now }).eq("id", existing.id);
    return NextResponse.json({ ok: true, userId: existing.id });
  }

  const { data, error } = await db.from("User").insert({
    id: crypto.randomUUID(),
    supabaseId,
    name,
    email,
    role: "STUDENT",
    createdAt: now,
    updatedAt: now,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Dispara boas-vindas + ativação do trial em background (não-bloqueante)
  void sendBoasVindas(data.id, email, name);
  void notifyAdminNewUser(name, email);

  return NextResponse.json({ ok: true, userId: data.id });
}
