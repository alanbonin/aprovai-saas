import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { log, LogEvent } from "@/lib/logger";

export const maxDuration = 30;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return new Stripe(key);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(LogEvent.PAYMENT_FAILED, { stage: "stripe_webhook_sig", detail: msg }, err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, planId, planSlug } = session.metadata ?? {};
      if (!userId || !planId) return NextResponse.json({ ok: true });

      const { data: plan } = await db.from("Plan").select("intervalDays").eq("id", planId).single();
      const intervalDays = plan?.intervalDays ?? 30;

      const now = new Date().toISOString();
      const endDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: existing } = await db.from("Subscription").select("id").eq("userId", userId).maybeSingle();
      if (existing) {
        await db.from("Subscription").update({
          planId, status: "ACTIVE",
          startDate: now, endDate,
          stripeSubscriptionId: session.subscription as string ?? null,
          updatedAt: now,
        }).eq("id", existing.id);
      } else {
        await db.from("Subscription").insert({
          id: crypto.randomUUID(), userId, planId,
          status: "ACTIVE", startDate: now, endDate,
          stripeSubscriptionId: session.subscription as string ?? null,
          createdAt: now, updatedAt: now,
        });
      }
      log.info(LogEvent.PAYMENT_APPROVED, { stage: "stripe_activated", userId, planSlug });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const stripeSubId = sub.id;
      await db.from("Subscription")
        .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
        .eq("stripeSubscriptionId", stripeSubId);
      log.info(LogEvent.PAYMENT_FAILED, { stage: "stripe_cancelled", stripeSubId });
    }
  } catch (err) {
    log.error(LogEvent.PAYMENT_FAILED, { stage: "stripe_webhook_process" }, err);
  }

  return NextResponse.json({ ok: true });
}
