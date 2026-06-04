import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createLimiter } from "@/lib/rate-limit";
import { log, LogEvent } from "@/lib/logger";

const adminAlunosLimiter = createLimiter({ max: 30, window: "1 m", prefix: "admin-alunos" });

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// GET — lista alunos com paginação e busca
export async function GET(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const search = (url.searchParams.get("search") ?? "").trim();
  const PAGE_SIZE = 50;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db.from("User").select("id, name, email, role, createdAt, origin, partnerId, groupTag", { count: "exact" })
    .order("createdAt", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return NextResponse.json({ data: data ?? [], total, page, totalPages });
}

// POST — cria novo aluno
export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await adminAlunosLimiter.check(`admin:${user.id}`);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const { name, email, password, planId, partnerId, groupTag } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email e password são obrigatórios" }, { status: 400 });

  // Cria usuário no Supabase Auth (admin)
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (authErr) return NextResponse.json({ error: "Erro de autenticação" }, { status: 400 });

  // Cria registro no DB (id gerado aqui pois o Supabase JS não usa @default(cuid()) do Prisma)
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const insertPayload: Record<string, unknown> = {
    id: newId,
    supabaseId: authUser.user.id,
    name,
    email,
    role: "STUDENT",
    origin: partnerId ? "partner" : "admin",
    createdAt: now,
    updatedAt: now,
  };
  if (partnerId) insertPayload.partnerId = partnerId;
  if (groupTag) insertPayload.groupTag = groupTag;

  const { data: dbUser, error: dbErr } = await db.from("User").insert(insertPayload).select("id").single();

  if (dbErr) {
    log.error("db.admin_alunos_create_error", { table: "User" }, dbErr);
    await db.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  // Atribui plano se informado; caso contrário ativa trial de 7 dias automaticamente
  if (dbUser?.id) {
    const subNow = new Date().toISOString();

    let resolvedPlanId = planId;
    let endDate = new Date();

    if (planId) {
      // Plano escolhido pelo admin → 1 ano
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      // Sem plano selecionado → busca trial e concede 7 dias
      const { data: trialPlan } = await db
        .from("Plan")
        .select("id")
        .eq("slug", "trial")
        .eq("active", true)
        .maybeSingle();
      if (trialPlan) {
        resolvedPlanId = trialPlan.id;
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    if (resolvedPlanId) {
      await db.from("Subscription").insert({
        id: crypto.randomUUID(),
        userId: dbUser.id,
        planId: resolvedPlanId,
        status: "ACTIVE",
        startDate: subNow,
        endDate: endDate.toISOString(),
        createdAt: subNow,
        updatedAt: subNow,
      });
    }
  }

  // Retorna o usuário completo para o frontend adicionar na lista sem reload
  return NextResponse.json({
    ok: true,
    user: {
      id: newId,
      name,
      email,
      role: "STUDENT",
      origin: partnerId ? "partner" : "admin",
      partnerId: partnerId ?? null,
      groupTag: groupTag ?? null,
      createdAt: now,
    },
  });
}

// PATCH — atribui/muda plano OU edita dados do aluno OU exclusão em lote
export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();

  // ── Editar dados do usuário ────────────────────────────────────────────
  if (body.action === "editUser") {
    const { userId, name, email, newPassword, groupTag } = body as {
      userId: string; name?: string; email?: string; newPassword?: string; groupTag?: string;
    };
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    const { data: u } = await db.from("User").select("supabaseId").eq("id", userId).maybeSingle();
    if (!u?.supabaseId) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const now = new Date().toISOString();
    const dbUpdates: Record<string, unknown> = { updatedAt: now };
    if (name?.trim()) dbUpdates.name = name.trim();
    if (email?.trim()) dbUpdates.email = email.trim().toLowerCase();
    if (groupTag !== undefined) dbUpdates.groupTag = groupTag || null;

    if (Object.keys(dbUpdates).length > 1) {
      const { error: dbErr } = await db.from("User").update(dbUpdates).eq("id", userId);
      if (dbErr) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    const authUpdates: Record<string, unknown> = {};
    if (email?.trim()) authUpdates.email = email.trim().toLowerCase();
    if (newPassword?.trim() && newPassword.trim().length >= 6) authUpdates.password = newPassword.trim();

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await db.auth.admin.updateUserById(u.supabaseId, authUpdates);
      if (authErr) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, name: dbUpdates.name ?? null, email: dbUpdates.email ?? null });
  }

  // ── Exclusão em lote ──────────────────────────────────────────────────
  if (body.action === "bulkDelete") {
    const { userIds } = body as { userIds: string[] };
    if (!Array.isArray(userIds) || userIds.length === 0)
      return NextResponse.json({ error: "userIds obrigatório" }, { status: 400 });

    const errors: string[] = [];
    for (const uid of userIds) {
      const { data: u } = await db.from("User").select("supabaseId, role").eq("id", uid).maybeSingle();
      if (!u || u.role === "ADMIN") continue;
      await db.from("UserAgent").delete().eq("userId", uid);
      await db.from("StudentSubject").delete().eq("userId", uid);
      await db.from("StudentProfile").delete().eq("userId", uid);
      await db.from("Progress").delete().eq("userId", uid);
      await db.from("SimuladoHistory").delete().eq("userId", uid);
      await db.from("Note").delete().eq("userId", uid);
      await db.from("FlashcardSet").delete().eq("userId", uid);
      await db.from("AiUsage").delete().eq("userId", uid);
      await db.from("Subscription").delete().eq("userId", uid);
      const { error: delErr } = await db.from("User").delete().eq("id", uid);
      if (delErr) { errors.push(uid); continue; }
      if (u.supabaseId) {
        await db.auth.admin.deleteUser(u.supabaseId).catch(() => {});
      }
    }
    return NextResponse.json({ ok: true, errors });
  }

  // ── Toggle isenção ────────────────────────────────────────────────────────
  if (body.action === "toggleIsento") {
    const { userId: uid, isento } = body as { userId: string; isento: boolean };
    if (!uid) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
    const now = new Date().toISOString();

    if (isento) {
      // Isentar: marca como ISENTO e dá prazo longo (10 anos)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 10);
      const { data: sub } = await db.from("Subscription").select("id").eq("userId", uid).maybeSingle();
      if (sub) {
        await db.from("Subscription").update({ mpPaymentId: "ISENTO", endDate: endDate.toISOString(), updatedAt: now }).eq("userId", uid);
      }
    } else {
      // Cobrar: remove isenção, mantém plano mas endDate em 30 dias (precisa pagar)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await db.from("Subscription").update({ mpPaymentId: null, endDate: endDate.toISOString(), updatedAt: now }).eq("userId", uid);
    }
    return NextResponse.json({ ok: true, isento });
  }

  const { userId, planId, durationDays, tipo } = body as {
    userId: string;
    planId?: string;
    durationDays?: number;
    tipo?: string;
  };
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  // Subscription tem userId @unique — sempre há no máximo 1 linha por usuário.
  // Estratégia: verificar se já existe e fazer UPDATE; caso não exista, fazer INSERT.
  const { data: existing } = await db.from("Subscription")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();

  if (planId) {
    // Valida se o plano existe
    const { data: planExists } = await db.from("Plan").select("id").eq("id", planId).maybeSingle();
    if (!planExists) {
      log.warn("db.admin_alunos_plan_not_found", { planId });
      return NextResponse.json({ error: `Plano não encontrado: ${planId}` }, { status: 400 });
    }

    const days = Math.min(36500, Math.max(1, durationDays ?? 365));
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const now = new Date().toISOString();
    // Marca como cortesia para distinguir de assinaturas pagas
    const mpPaymentId = `CORTESIA:${tipo ?? "cortesia"}`;

    if (existing) {
      // Atualiza a assinatura existente
      const { error: updateErr } = await db.from("Subscription")
        .update({
          planId,
          status: "ACTIVE",
          startDate: now,
          endDate: endDate.toISOString(),
          mpPaymentId,
          updatedAt: now,
        })
        .eq("userId", userId);

      if (updateErr) {
        log.error("db.admin_alunos_subscription_update", { table: "Subscription" }, updateErr);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
      }
    } else {
      // Cria nova assinatura (usuário sem assinatura prévia)
      const { error: insertErr } = await db.from("Subscription").insert({
        id: crypto.randomUUID(),
        userId,
        planId,
        status: "ACTIVE",
        startDate: now,
        endDate: endDate.toISOString(),
        mpPaymentId,
        createdAt: now,
        updatedAt: now,
      });

      if (insertErr) {
        log.error("db.admin_alunos_subscription_insert", { table: "Subscription" }, insertErr);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
      }
    }
  } else if (existing) {
    // Plano removido (Gratuito) — marca como EXPIRED
    await db.from("Subscription")
      .update({ status: "EXPIRED", updatedAt: new Date().toISOString() })
      .eq("userId", userId);
  }

  log.info(LogEvent.ADMIN_USER_EDIT, { targetUserId: userId, planId: planId || null });
  return NextResponse.json({ ok: true });
}

// DELETE — remove aluno e todos os dados relacionados
export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  const { data: u } = await db.from("User").select("supabaseId").eq("id", userId).maybeSingle();
  if (!u?.supabaseId) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Remove todos os registros com FK em userId (ordem: dependentes → pai)
  await db.from("UserAgent").delete().eq("userId", userId);
  await db.from("StudentSubject").delete().eq("userId", userId);
  await db.from("StudentProfile").delete().eq("userId", userId);
  await db.from("Progress").delete().eq("userId", userId);
  await db.from("SimuladoHistory").delete().eq("userId", userId);
  await db.from("Note").delete().eq("userId", userId);
  await db.from("FlashcardSet").delete().eq("userId", userId);
  await db.from("AiUsage").delete().eq("userId", userId);
  await db.from("Subscription").delete().eq("userId", userId);

  // Agora deleta o User (sem FKs pendentes)
  const { error: delErr } = await db.from("User").delete().eq("id", userId);
  if (delErr) {
    log.error("db.admin_alunos_delete_error", { table: "User" }, delErr);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  // Remove do Supabase Auth
  const { error: authErr } = await db.auth.admin.deleteUser(u.supabaseId);
  if (authErr) {
    // Não falha — o DB já foi limpo, o usuário não consegue mais logar
    log.warn("auth.admin_delete_auth_user_warning", {}, authErr);
  }

  return NextResponse.json({ ok: true });
}
