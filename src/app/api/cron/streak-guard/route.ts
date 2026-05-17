import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import webpush from "web-push";

/**
 * GET /api/cron/streak-guard
 * Cron diário às 00:00 UTC (21:00 BRT): envia push notification para alunos
 * que têm streak > 0 mas ainda não estudaram hoje — alertando que o streak está em risco.
 */

const PUSH_PREFIX = "__PUSH_SUBSCRIPTION__";

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function configVapid() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_SUBJECT ?? "mailto:contato@aprovai.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(mail, pub, priv);
  return true;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Alunos com streak ativo
  const { data: perfis } = await db
    .from("StudentProfile")
    .select("userId, streak, lastStudyDate")
    .gt("streak", 0);

  if (!perfis?.length) return NextResponse.json({ checked: 0, sent: 0 });

  // 2. Filtra quem ainda não estudou hoje
  const atRiskUserIds = perfis
    .filter(p => (p.lastStudyDate as string | null)?.slice(0, 10) !== todayStr)
    .map(p => p.userId as string);

  if (atRiskUserIds.length === 0) return NextResponse.json({ checked: perfis.length, sent: 0 });

  // 3. Busca quem tem push subscription ativo
  const { data: subscriptions } = await db
    .from("Note")
    .select("content, userId")
    .eq("subjectId", PUSH_PREFIX)
    .in("userId", atRiskUserIds);

  if (!subscriptions?.length) return NextResponse.json({ checked: perfis.length, atRisk: atRiskUserIds.length, sent: 0 });

  if (!configVapid()) {
    return NextResponse.json({ error: "VAPID não configurado" }, { status: 500 });
  }

  let sent = 0;
  const expired: string[] = [];

  for (const note of subscriptions) {
    // Encontra streak do usuário para personalizar mensagem
    const perfil = perfis.find(p => p.userId === note.userId);
    const streak = (perfil?.streak as number) ?? 1;

    const payload = JSON.stringify({
      title: `🔥 Streak em risco! ${streak} dias consecutivos`,
      body: streak >= 7
        ? `Você tem ${streak} dias seguidos de estudo — não perca agora! Responda ao menos 1 questão.`
        : `Não quebre sua sequência de ${streak} dia${streak > 1 ? "s" : ""}! Estude um pouquinho antes de dormir.`,
      icon:  "/api/icon?size=192",
      badge: "/api/icon?size=192",
      url:   "/questoes",
      tag:   "streak-guard",
    });

    let sub: webpush.PushSubscription;
    try {
      sub = JSON.parse(note.content) as webpush.PushSubscription;
    } catch { continue; }

    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 410 || code === 404) {
        try {
          expired.push((sub as unknown as { endpoint: string }).endpoint.slice(-40));
        } catch {}
      }
    }
  }

  // Limpa subscriptions expiradas
  for (const suffix of expired) {
    await db.from("Note").delete().eq("subjectId", PUSH_PREFIX).like("content", `%${suffix}%`);
  }

  return NextResponse.json({
    checked: perfis.length,
    atRisk: atRiskUserIds.length,
    withPush: subscriptions.length,
    sent,
    expired: expired.length,
  });
}
