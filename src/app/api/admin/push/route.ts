import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const PREFIX = "__PUSH_SUBSCRIPTION__";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

function configVapid(): boolean {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@aprovai.app",
    pub,
    priv,
  );
  return true;
}

// ── POST — admin envia push para todos os assinantes ─────────────────────────
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  if (!configVapid()) {
    return NextResponse.json({ error: "VAPID keys não configuradas no servidor" }, { status: 500 });
  }

  const body = await req.json() as { title?: string; body?: string; url?: string; userId?: string };

  const payload = JSON.stringify({
    title: body.title ?? "Aprovai",
    body:  body.body  ?? "Hora de estudar! 📚",
    icon:  "/api/icon?size=192",
    badge: "/api/icon?size=192",
    url:   body.url   ?? "/workspace",
    tag:   "aprovai-admin-push",
  });

  // Busca subscriptions (todas ou de um usuário específico)
  let query = db.from("Note").select("id, content, userId").eq("subjectId", PREFIX);
  if (body.userId) query = query.eq("userId", body.userId);

  const { data: notes, error: fetchErr } = await query;
  if (fetchErr) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  let sent = 0, failed = 0;
  const expired: string[] = [];

  for (const note of notes ?? []) {
    try {
      const sub = JSON.parse(note.content) as webpush.PushSubscription;
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 410 || code === 404) expired.push(note.id);
      failed++;
    }
  }

  // Remove subscriptions expiradas
  if (expired.length > 0) {
    await db.from("Note").delete().in("id", expired);
  }

  return NextResponse.json({ sent, failed, expired: expired.length, total: (notes ?? []).length });
}
