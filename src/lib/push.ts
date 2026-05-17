/**
 * Utilitário de push notification server-side.
 * Permite enviar notificações diretamente de rotas de API internas
 * sem precisar chamar o endpoint /api/push/send (que requer CRON_SECRET).
 *
 * Uso:
 *   import { sendPushToUser } from "@/lib/push";
 *   await sendPushToUser(userId, { title: "Badge!", body: "Você desbloqueou X" });
 */

import webpush from "web-push";
import { db } from "@/lib/db";

const PREFIX = "__PUSH_SUBSCRIPTION__";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_SUBJECT ?? "mailto:contato@aprovai.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(mail, pub, priv);
  vapidConfigured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Envia push notification para um usuário específico.
 * Fire-and-forget friendly — não lança exceção se falhar.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureVapid()) return; // VAPID não configurado — silencia

  // Busca subscriptions do usuário
  const { data: notes } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", userId)
    .eq("subjectId", PREFIX);

  if (!notes?.length) return;

  const message = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon ?? "/api/icon?size=192",
    badge: "/api/icon?size=192",
    url:   payload.url ?? "/hoje",
    tag:   "aprovai-notif",
  });

  const expiredIds: string[] = [];

  await Promise.all(
    notes.map(async (note) => {
      try {
        const sub = JSON.parse(note.content) as webpush.PushSubscription;
        await webpush.sendNotification(sub, message);
      } catch (err) {
        // 410 Gone = subscription expirada
        if ((err as { statusCode?: number }).statusCode === 410) {
          expiredIds.push(note.id);
        }
        // outros erros ignorados silenciosamente
      }
    })
  );

  // Remove subscriptions expiradas
  if (expiredIds.length > 0) {
    await db.from("Note").delete().in("id", expiredIds).catch(() => {});
  }
}
