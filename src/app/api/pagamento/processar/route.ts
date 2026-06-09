import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import MercadoPago, { Payment } from "mercadopago";
import { log, LogEvent } from "@/lib/logger";
import { z } from "zod";

function getMp() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPago({ accessToken: token });
}

// Allowlist: apenas estes campos são aceitos do cliente — nunca transaction_amount
const PaymentSchema = z.object({
  token: z.string().min(1),
  planId: z.string().min(1),
  installments: z.number().int().min(1).max(1).default(1),
  payment_method_id: z.string().min(1),
  issuer_id: z.string().optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string(),
    }).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Valida e filtra o body — rejeita qualquer campo fora da allowlist
    const rawBody = await req.json();
    const parsed = PaymentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Busca o preço DO BANCO — nunca aceitar valor do cliente
    const { data: plan } = await db
      .from("Plan")
      .select("price, name, id")
      .eq("id", parsed.data.planId)
      .eq("active", true)
      .single();
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    if (plan.price <= 0) return NextResponse.json({ error: "Plano gratuito não usa este endpoint" }, { status: 400 });

    const mp = getMp();
    const paymentApi = new Payment(mp);

    const payment = await paymentApi.create({
      body: {
        transaction_amount: plan.price,            // ← SEMPRE DO BANCO
        description: `AprovAI360 — ${plan.name}`,
        token: parsed.data.token,
        installments: parsed.data.installments,
        payment_method_id: parsed.data.payment_method_id,
        issuer_id: parsed.data.issuer_id ? Number(parsed.data.issuer_id) : undefined,
        payer: parsed.data.payer ?? { email: dbUser.email },
        external_reference: `${dbUser.id}|${plan.id}`,
        metadata: { userId: dbUser.id },
      },
      requestOptions: {
        idempotencyKey: `${dbUser.id}-${Date.now()}`,
      },
    });

    return NextResponse.json({
      status: payment.status,
      statusDetail: payment.status_detail,
      paymentId: payment.id,
    });
  } catch (err) {
    log.error(LogEvent.PAYMENT_FAILED, { stage: "processar_payment" }, err);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
