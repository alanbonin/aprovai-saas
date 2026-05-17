import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// POST — cria novo aluno
export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { name, email, password, planId } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email e password são obrigatórios" }, { status: 400 });

  // Cria usuário no Supabase Auth (admin)
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

  // Cria registro no DB (id gerado aqui pois o Supabase JS não usa @default(cuid()) do Prisma)
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: dbUser, error: dbErr } = await db.from("User").insert({
    id: newId,
    supabaseId: authUser.user.id,
    name,
    email,
    role: "STUDENT",
    createdAt: now,
    updatedAt: now,
  }).select("id").single();

  if (dbErr) {
    console.error("[alunos POST] dbErr:", JSON.stringify(dbErr));
    await db.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: dbErr.message, details: dbErr }, { status: 500 });
  }

  // Atribui plano se informado
  if (planId && dbUser?.id) {
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const subNow = new Date().toISOString();
    await db.from("Subscription").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      planId,
      status: "ACTIVE",
      startDate: subNow,
      endDate: endDate.toISOString(),
      createdAt: subNow,
      updatedAt: subNow,
    });
  }

  return NextResponse.json({ ok: true, userId: dbUser?.id });
}

// PATCH — atribui/muda plano de um aluno
export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { userId, planId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  // Cancela subscrições ativas anteriores
  await db.from("Subscription").update({ status: "CANCELLED" }).eq("userId", userId).eq("status", "ACTIVE");

  if (planId) {
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const subNow = new Date().toISOString();
    await db.from("Subscription").insert({
      id: crypto.randomUUID(),
      userId,
      planId,
      status: "ACTIVE",
      startDate: subNow,
      endDate: endDate.toISOString(),
      createdAt: subNow,
      updatedAt: subNow,
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — remove aluno
export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  const { data: u } = await db.from("User").select("supabaseId").eq("id", userId).single();
  if (!u?.supabaseId) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  await db.from("Subscription").delete().eq("userId", userId);
  await db.from("User").delete().eq("id", userId);
  await db.auth.admin.deleteUser(u.supabaseId);

  return NextResponse.json({ ok: true });
}
