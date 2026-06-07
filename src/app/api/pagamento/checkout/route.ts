import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import MercadoPago, { PreApproval } from "mercadopago";
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

    // ── Plano pago: PreApproval (assinatura recorrente automática via MP) ────
    const mp = getMp();
    const { frequency, frequency_type } = getFrequency(plan.intervalDays ?? 30);
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

    log.info(LogEvent.PAYMENT_APPROVED, { stage: "preapproval_created", userId: dbUser.id });

    return NextResponse.json({ checkoutUrl: preApproval.init_point });
  } catch (err) {
    log.error(LogEvent.PAYMENT_FAILED, { stage: "checkout_create" }, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
