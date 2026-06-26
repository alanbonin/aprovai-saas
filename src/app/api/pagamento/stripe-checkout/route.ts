import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import Stripe from "stripe";
import { checkoutLimiter } from "@/lib/rate-limit";
import { log, LogEvent } from "@/lib/logger";

export const maxDuration = 30;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const rl = await checkoutLimiter.check(`checkout:${user.id}`);
    if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { planId } = await req.json();
    const { data: plan } = await db.from("Plan").select("*").eq("id", planId).single();
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: {
            name: `AprovAI360 — ${plan.name}`,
            description: plan.features?.[0] ?? "Plano de estudos para concursos",
          },
          unit_amount: Math.round(plan.price * 100),
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      customer_email: dbUser.email ?? undefined,
      success_url: `${appUrl}/planos/sucesso?plan=${plan.slug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/planos?error=pagamento`,
      metadata: {
        userId: dbUser.id,
        planId: plan.id,
        planSlug: plan.slug,
      },
      locale: "pt-BR",
    });

    log.info(LogEvent.PAYMENT_APPROVED, { stage: "stripe_checkout_ok", userId: dbUser.id });
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error(LogEvent.PAYMENT_FAILED, { stage: "stripe_checkout_create", detail: errMsg }, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
