import { NextResponse } from "next/server";
import webpush from "web-push";
import { db } from "@/lib/db";

const PREFIX = "__PUSH_SUBSCRIPTION__";

function configVapid() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_SUBJECT ?? "mailto:contato@aprovai.app";
  if (!pub || !priv) throw new Error("VAPID keys não configuradas");
  webpush.setVapidDetails(mail, pub, priv);
}

function checkAuth(req: Request) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

interface SendPayload {
  title?:      string;
  body?:       string;
  url?:        string;
  userId?:     string;   // enviar para usuário específico; omit = broadcast
  adminOnly?:  boolean;  // enviar apenas para usuários com role = ADMIN
}

// ── POST — envia push notification ───────────────────────────────────────────
export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    configVapid();
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const body = await req.json() as SendPayload;
  const payload = JSON.stringify({
    title: body.title ?? "Aprovai",
    body:  body.body  ?? "Hora de estudar! 📚",
    icon:  "/api/icon?size=192",
    badge: "/api/icon?size=192",
    url:   body.url   ?? "/workspace",
    tag:   "aprovai-lembrete",
  });

  // Se adminOnly, busca primeiro os IDs dos admins
  let adminUserIds: string[] | null = null;
  if (body.adminOnly) {
    const { data: admins } = await db.from("User").select("id").eq("role", "ADMIN");
    adminUserIds = (admins ?? []).map((u: { id: string }) => u.id);
    if (adminUserIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, expired: 0, note: "Nenhum admin com push ativo" });
    }
  }

  // Busca subscriptions
  let query = db.from("Note").select("content, userId").eq("subjectId", PREFIX);
  if (body.userId) {
    query = query.eq("userId", body.userId);
  } else if (adminUserIds) {
    query = query.in("userId", adminUserIds);
  }

  const { data: notes, error: fetchErr } = await query;
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  for (const note of notes ?? []) {
    let sub: PushSubscription;
    try {
      sub = JSON.parse(note.content) as PushSubscription;
    } catch { failed++; continue; }

    try {
      await webpush.sendNotification(sub as unknown as webpush.PushSubscription, payload);
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 410 || code === 404) {
        try {
          const ep = (sub as unknown as { endpoint: string }).endpoint;
          expired.push(ep.slice(-40));
        } catch {}
      }
      failed++;
    }
  }

  // Limpa subscriptions expiradas
  for (const suffix of expired) {
    await db.from("Note").delete().eq("subjectId", PREFIX).like("content", `%${suffix}%`);
  }

  return NextResponse.json({ sent, failed, expired: expired.length });
}
