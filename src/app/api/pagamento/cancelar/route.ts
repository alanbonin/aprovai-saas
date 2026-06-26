import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import Stripe from "stripe";
import { log, LogEvent } from "@/lib/logger";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return new Stripe(key);
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { data: sub } = await db
      .from("Subscription")
      .select("id, stripeSubscriptionId, startDate, status")
      .eq("userId", dbUser.id)
      .maybeSingle();

    if (!sub) return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });

    const stripe = getStripe();
    const stripeSubId = sub.stripeSubscriptionId as string | null;

    // Verifica se está dentro dos 7 dias (CDC art. 49)
    const startDate = sub.startDate ? new Date(sub.startDate as string) : null;
    const withinCoolingOff = startDate
      ? (Date.now() - startDate.getTime()) < 7 * 24 * 60 * 60 * 1000
      : false;

    if (stripeSubId) {
      try {
        if (withinCoolingOff) {
          // Cancela imediatamente e solicita reembolso (7 dias CDC)
          await stripe.subscriptions.cancel(stripeSubId);

          // Busca o último payment intent para reembolsar
          const invoices = await stripe.invoices.list({ subscription: stripeSubId, limit: 1 });
          const paymentIntentId = invoices.data[0]?.payment_intent as string | null;
          if (paymentIntentId) {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
          }
        } else {
          // Cancela no fim do período (acesso mantido até endDate)
          await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
        }
      } catch (stripeErr) {
        log.error(LogEvent.PAYMENT_FAILED, {
          stage: "stripe_cancel_subscription",
          stripeSubId,
          userId: dbUser.id,
        }, stripeErr);
      }
    }

    // Cancela no banco
    const now = new Date().toISOString();
    await db.from("Subscription").update({
      status: "CANCELLED",
      updatedAt: now,
      ...(withinCoolingOff ? { endDate: now } : {}), // acesso encerrado imediatamente se reembolso
    }).eq("id", sub.id);

    log.info(LogEvent.PAYMENT_FAILED, {
      stage: withinCoolingOff ? "cancel_refund_7days" : "cancel_end_of_period",
      userId: dbUser.id,
    });

    return NextResponse.json({ ok: true, refunded: withinCoolingOff });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
