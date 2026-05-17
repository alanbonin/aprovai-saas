import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import webpush from "web-push";

const PUSH_PREFIX = "__PUSH_SUBSCRIPTION__";

function configurePush() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@aprovai.app",
    pub, priv,
  );
  return true;
}

async function sendPushToUser(userId: string, payload: object): Promise<number> {
  const { data: notes } = await db
    .from("Note").select("id, content")
    .eq("userId", userId).eq("subjectId", PUSH_PREFIX);
  if (!notes?.length) return 0;

  let sent = 0;
  const payloadStr = JSON.stringify(payload);
  for (const note of notes) {
    try {
      const sub = JSON.parse(note.content) as webpush.PushSubscription;
      await webpush.sendNotification(sub, payloadStr);
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 410 || code === 404) {
        // Subscription expirada — remove
        await db.from("Note").delete().eq("id", note.id);
      }
    }
  }
  return sent;
}

/**
 * POST /api/email/lembrete
 * Cron job diário: envia lembrete para usuários com:
 * - Flashcards vencidos hoje
 * - Prova em 30, 7 ou 1 dia
 * - Streak em risco (não estudou ontem)
 *
 * Deve ser chamado por um cron job externo (Vercel Cron, GitHub Actions, etc.)
 * com header Authorization: Bearer CRON_SECRET
 */

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada.");
  return new Resend(key);
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "Aprovai <noreply@aprovai.com.br>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai.com.br";

function buildLembreteHtml({
  name, flashcardsDue, daysToProva, cargo, streakRisk,
}: {
  name: string;
  flashcardsDue: number;
  daysToProva: number | null;
  cargo: string | null;
  streakRisk: boolean;
}) {
  const items: string[] = [];
  if (flashcardsDue > 0) items.push(`🃏 <strong>${flashcardsDue} flashcard${flashcardsDue > 1 ? "s" : ""} vencido${flashcardsDue > 1 ? "s" : ""}</strong> aguardando revisão`);
  if (streakRisk) items.push(`🔥 Não perca sua sequência de estudos — estude pelo menos 1 questão hoje`);
  if (daysToProva !== null && [30, 7, 1].includes(daysToProva)) {
    items.push(`⏰ Faltam <strong>${daysToProva} dia${daysToProva > 1 ? "s" : ""}</strong> para sua prova${cargo ? ` de ${cargo}` : ""}`);
  }
  if (items.length === 0) return null;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#080c18;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:520px;margin:40px auto;padding:0 20px">
    <div style="background:#0f1523;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:32px">🎓</span>
        <h1 style="color:#fff;font-size:20px;font-weight:700;margin:8px 0 4px">Hora de estudar, ${name}!</h1>
        <p style="color:#6b7280;font-size:13px;margin:0">Seu lembrete diário do Aprovai</p>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;font-weight:500">Pendências de hoje:</p>
        <ul style="margin:0;padding:0;list-style:none">
          ${items.map(i => `<li style="color:#e2e8f0;font-size:14px;margin-bottom:8px;padding-left:4px">${i}</li>`).join("")}
        </ul>
      </div>

      <a href="${APP_URL}/workspace" style="display:block;background:#4f46e5;color:#fff;text-align:center;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;font-size:14px">
        Acessar workspace →
      </a>

      <p style="color:#374151;font-size:11px;text-align:center;margin-top:24px">
        Aprovai · <a href="${APP_URL}/workspace?unsubscribe=1" style="color:#374151">Cancelar lembretes</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem secret, aceita (dev)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function runCron() {
  try {
    const resend = getResend();
    const pushEnabled = configurePush();

    // Busca usuários ativos com assinatura ativa
    const { data: subscriptions } = await db
      .from("Subscription")
      .select("userId")
      .eq("status", "ACTIVE")
      .gte("endDate", new Date().toISOString());

    if (!subscriptions?.length) return NextResponse.json({ sent: 0 });

    const allUserIds = subscriptions.map(s => s.userId);
    // Filtra quem optou por não receber lembrete
    const { filterByEmailPref } = await import("@/lib/email-prefs");
    const userIds = await filterByEmailPref(allUserIds, "emailLembrete");
    const { data: users } = await db.from("User").select("id, name, email").in("id", userIds);
    if (!users?.length) return NextResponse.json({ sent: 0 });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    let sent = 0;
    let pushSent = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Flashcards vencidos
        const { data: sets } = await db.from("FlashcardSet")
          .select("cards").eq("userId", user.id);
        let flashcardsDue = 0;
        for (const s of sets ?? []) {
          const cards = Array.isArray(s.cards) ? s.cards : [];
          for (const c of cards as { nextReview?: string }[]) {
            if (!c.nextReview || new Date(c.nextReview) <= now) flashcardsDue++;
          }
        }

        // Dias para a prova
        const { data: profile } = await db.from("StudentProfile")
          .select("dataProva, cargo").eq("userId", user.id).single();
        let daysToProva: number | null = null;
        if (profile?.dataProva) {
          daysToProva = Math.ceil((new Date(profile.dataProva).getTime() - now.getTime()) / 86400000);
          if (daysToProva < 0) daysToProva = null;
        }

        // Streak em risco (não estudou ontem)
        const { data: yesterdayActivity } = await db.from("Progress")
          .select("id", { count: "exact", head: true })
          .eq("userId", user.id)
          .gte("createdAt", `${yesterday}T00:00:00`)
          .lte("createdAt", `${yesterday}T23:59:59`);
        const streakRisk = (yesterdayActivity as unknown as { count: number })?.count === 0;

        const html = buildLembreteHtml({
          name: user.name.split(" ")[0],
          flashcardsDue,
          daysToProva,
          cargo: profile?.cargo ?? null,
          streakRisk,
        });

        // Só envia se tiver algo relevante
        if (!html) continue;

        const provAlerta = daysToProva !== null && [30, 7, 1].includes(daysToProva);
        const subject = provAlerta
          ? `⏰ Faltam ${daysToProva} dias para sua prova — Aprovai`
          : flashcardsDue > 0
          ? `🃏 ${flashcardsDue} flashcard${flashcardsDue > 1 ? "s" : ""} aguardando revisão — Aprovai`
          : "🔥 Não perca sua sequência de estudos — Aprovai";

        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject,
          html,
        });

        sent++;

        // Push notification (paralelo ao email)
        if (pushEnabled) {
          const pushBody = flashcardsDue > 0
            ? `🃏 ${flashcardsDue} flashcard${flashcardsDue > 1 ? "s" : ""} para revisar hoje`
            : streakRisk
            ? "🔥 Estude pelo menos 1 questão para manter sua sequência!"
            : `⏰ Faltam ${daysToProva} dia${daysToProva === 1 ? "" : "s"} para sua prova`;
          const p = await sendPushToUser(user.id, {
            title: `Aprovai — ${user.name.split(" ")[0]}`,
            body:  pushBody,
            url:   "/workspace",
            tag:   "aprovai-lembrete",
          });
          pushSent += p;
        }
      } catch (e) {
        errors.push(`${user.email}: ${String(e)}`);
      }
    }

    return { sent, pushSent, errors: errors.length ? errors : undefined };
  } catch (err) {
    return { error: String(err) };
  }
}

// POST: trigger manual (dashboard admin, testes)
export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const result = await runCron();
  if ("error" in result) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}

// GET: Vercel Cron invoca via GET — executa o mesmo fluxo de envio
export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const result = await runCron();
  if ("error" in result) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
