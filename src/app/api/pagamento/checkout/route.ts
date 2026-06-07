import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import MercadoPago, { PreApproval, Preference } from "mercadopago";
import { checkoutLimiter } from "@/lib/rate-limit";
import { log, LogEvent } from "@/lib/logger";

export const maxDuration = 30;

function getMp() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPago({ accessToken: token });
}

function getFrequency(intervalDays: number): { frequency: number; frequency_type: "months" | "days" } {
  if (intervalDays >= 360) return { frequency: 12, frequency_type: "months" };
  if (intervalDays >= 28)  return { frequency: 1,  frequency_type: "months" };
  return { frequency: intervalDays, frequency_type: "days" };
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

    // ── Plano Trial/Gratuito: ativa diretamente sem checkout ────────────────
    if (plan.price === 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan.intervalDays ?? 7));
      const now = new Date().toISOString();

      const { data: existing } = await db
        .from("Subscription").select("id").eq("userId", dbUser.id).maybeSingle();

      if (existing) {
        await db.from("Subscription").update({
          planId, status: "TRIAL",
          startDate: now, endDate: endDate.toISOString(),
          mpPaymentId: null, updatedAt: now,
        }).eq("id", existing.id);
      } else {
        await db.from("Subscription").insert({
          id: crypto.randomUUID(), userId: dbUser.id,
          planId, status: "TRIAL",
          startDate: now, endDate: endDate.toISOString(),
          createdAt: now, updatedAt: now,
        });
      }
      return NextResponse.json({ checkoutUrl: null, activated: true });
    }

    const mp = getMp();
    const { frequency, frequency_type } = getFrequency(plan.intervalDays ?? 30);

    // ── Tenta PreApproval (assinatura recorrente) ────────────────────────────
    try {
      const preApprovalApi = new PreApproval(mp);
      const preApproval = await preApprovalApi.create({
        body: {
          reason: `AprovAI360 — ${plan.name}`,
          external_reference: `${dbUser.id}|${plan.id}`,
          payer_email: dbUser.email ?? undefined,
          auto_recurring: {
            frequency,
            frequency_type,
            transaction_amount: plan.price,
            currency_id: "BRL",
          },
          back_url: `${appUrl}/planos/sucesso?plan=${plan.slug}`,
          status: "pending",
        },
      });

      if (preApproval.init_point) {
        // Salva mpSubscriptionId para cancelamento posterior
        if (preApproval.id) {
          const now = new Date().toISOString();
          const { data: existing } = await db.from("Subscription").select("id").eq("userId", dbUser.id).maybeSingle();
          if (existing) {
            await db.from("Subscription").update({ mpSubscriptionId: String(preApproval.id), updatedAt: now }).eq("id", existing.id);
          } else {
            await db.from("Subscription").insert({
              id: crypto.randomUUID(), userId: dbUser.id, planId,
              status: "PENDING", startDate: now,
              endDate: new Date(Date.now() + 86400000).toISOString(),
              mpSubscriptionId: String(preApproval.id),
              createdAt: now, updatedAt: now,
            });
          }
        }
        log.info(LogEvent.PAYMENT_APPROVED, { stage: "preapproval_ok", userId: dbUser.id });
        return NextResponse.json({ checkoutUrl: preApproval.init_point });
      }
    } catch (preApprovalErr) {
      log.error(LogEvent.PAYMENT_FAILED, { stage: "preapproval_failed" }, preApprovalErr);
      // Fallback para Preference (pagamento avulso)
    }

    // ── Fallback: Preference (pagamento único) ───────────────────────────────
    const preference = new Preference(mp);
    const response = await preference.create({
      body: {
        items: [{ id: plan.id, title: `AprovAI360 — ${plan.name}`, quantity: 1, unit_price: plan.price, currency_id: "BRL" }],
        payer: { email: dbUser.email, name: dbUser.name },
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
          installments: 1,
        },
        back_urls: {
          success: `${appUrl}/planos/sucesso?plan=${plan.slug}`,
          failure: `${appUrl}/planos?error=pagamento`,
          pending: `${appUrl}/planos/pendente?plan=${plan.slug}`,
        },
        auto_return: "approved",
        external_reference: `${dbUser.id}|${plan.id}`,
        notification_url: `${appUrl}/api/pagamento/webhook`,
        statement_descriptor: "APROVAI360",
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    log.info(LogEvent.PAYMENT_APPROVED, { stage: "preference_ok", userId: dbUser.id });
    return NextResponse.json({ checkoutUrl: response.init_point });
  } catch (err) {
    log.error(LogEvent.PAYMENT_FAILED, { stage: "checkout_create" }, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
