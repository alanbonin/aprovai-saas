import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import webpush from "web-push";

const PUSH_PREFIX = "__PUSH_SUBSCRIPTION__";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

function configVapid(): boolean {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_SUBJECT ?? "mailto:contato@aprovai.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(mail, pub, priv);
  return true;
}

/**
 * GET /api/admin/reengajamento
 * Lista alunos inativos (sem estudo nos últimos N dias) com assinatura ativa.
 * Query param: ?dias=7 (padrão: 7)
 */
export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const url = new URL(req.url);
  const dias = parseInt(url.searchParams.get("dias") ?? "7", 10);
  const cutoff = new Date(Date.now() - dias * 86400000).toISOString();

  // Alunos com assinatura ativa
  const { data: subs } = await db
    .from("Subscription")
    .select("userId, planId, Plan:planId(name)")
    .eq("status", "ACTIVE");

  const activeSubUserIds = (subs ?? []).map(s => s.userId as string);
  if (activeSubUserIds.length === 0) return NextResponse.json({ alunos: [], total: 0 });

  // Usuários que estudaram nos últimos N dias
  const { data: recentActivity } = await db
    .from("Progress")
    .select("userId")
    .in("userId", activeSubUserIds)
    .gte("createdAt", cutoff);

  const activeIds = new Set((recentActivity ?? []).map(p => p.userId as string));

  // Inativos = com assinatura mas sem atividade
  const inactiveIds = activeSubUserIds.filter(id => !activeIds.has(id));
  if (inactiveIds.length === 0) return NextResponse.json({ alunos: [], total: 0 });

  const { data: users } = await db
    .from("User")
    .select("id, name, email")
    .in("id", inactiveIds.slice(0, 100));

  const { data: profiles } = await db
    .from("StudentProfile")
    .select("userId, streak, lastStudyDate")
    .in("userId", inactiveIds.slice(0, 100));

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.userId as string, p]));
  const planMap = Object.fromEntries(
    (subs ?? []).map(s => {
      const plan = Array.isArray(s.Plan) ? s.Plan[0] : s.Plan;
      return [s.userId as string, (plan as { name?: string } | null)?.name ?? "—"];
    })
  );

  const alunos = (users ?? []).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    plan: planMap[u.id] ?? "—",
    lastStudyDate: (profileMap[u.id]?.lastStudyDate as string | null) ?? null,
    streak: (profileMap[u.id]?.streak as number) ?? 0,
    diasSemEstudo: profileMap[u.id]?.lastStudyDate
      ? Math.floor((Date.now() - new Date(profileMap[u.id].lastStudyDate as string).getTime()) / 86400000)
      : null,
  })).sort((a, b) => (b.diasSemEstudo ?? 999) - (a.diasSemEstudo ?? 999));

  return NextResponse.json({ alunos, total: alunos.length });
}

/**
 * POST /api/admin/reengajamento
 * Envia push de reengajamento para lista de userIds.
 * Body: { userIds: string[]; title?: string; body?: string }
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  if (!configVapid()) {
    return NextResponse.json({ error: "VAPID keys não configuradas" }, { status: 500 });
  }

  const { userIds, title, body: msgBody } = await req.json() as {
    userIds: string[];
    title?: string;
    body?: string;
  };

  if (!userIds?.length) return NextResponse.json({ error: "userIds obrigatório" }, { status: 400 });

  const payload = JSON.stringify({
    title: title ?? "Sua sequência está em risco! 🔥",
    body:  msgBody ?? "Você não estuda há alguns dias. Que tal retomar agora? Só 10 questões!",
    icon:  "/api/icon?size=192",
    badge: "/api/icon?size=192",
    url:   "/hoje",
    tag:   "aprovai-reengajamento",
  });

  // Busca subscriptions dos usuários
  const { data: subscriptions } = await db
    .from("Note")
    .select("id, userId, content")
    .in("userId", userIds)
    .eq("subjectId", PUSH_PREFIX);

  let sent = 0; let failed = 0; const expired: string[] = [];

  await Promise.all(
    (subscriptions ?? []).map(async (note) => {
      try {
        const sub = JSON.parse(note.content as string) as webpush.PushSubscription;
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          expired.push(note.id as string);
        }
        failed++;
      }
    })
  );

  if (expired.length) await db.from("Note").delete().in("id", expired).catch(() => {});

  return NextResponse.json({ ok: true, sent, failed, total: subscriptions?.length ?? 0 });
}
