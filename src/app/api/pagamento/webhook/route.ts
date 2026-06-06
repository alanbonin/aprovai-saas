import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import MercadoPago, { Payment, MerchantOrder } from "mercadopago";
import { createHmac } from "crypto";
import { log as slog, LogEvent } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";

// A instância é criada dentro do handler para evitar falha no module load
// quando MERCADOPAGO_ACCESS_TOKEN não está definida no ambiente.
function getMPInstance(): MercadoPago {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada");
  return new MercadoPago({ accessToken: token });
}

// ── Verificação de assinatura HMAC ────────────────────────────────────────────
function verifySignature(req: Request, rawBody: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  // Em produção, secret é obrigatório — rejeita se não configurado
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true; // dev local sem secret configurado
  }

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const dataId = new URL(req.url).searchParams.get("data.id") ?? "";

  // Formato MP: "ts=...,v1=..."
  const parts = Object.fromEntries(xSignature.split(",").map(p => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return expected === v1;
}

// ── Audit log no Note table ───────────────────────────────────────────────────
async function log(type: string, payload: unknown, error?: string) {
  try {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: "webhook",
      subjectId: "__WEBHOOK_LOG__",
      content: JSON.stringify({ type, payload, error, ts: new Date().toISOString() }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch {}
}

// ── Helpers de subscription ────────────────────────────────────────────────────
async function activateSubscription(userId: string, planId: string, mpPaymentId: string) {
  const { data: plan } = await db.from("Plan").select("intervalDays").eq("id", planId).single();
  if (!plan) {
    // Alerta ao admin — pagamento aprovado mas plano não existe no banco
    sendEmail({
      to: process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? "admin@aprovai360.com.br",
      subject: "⚠️ AprovAI: Pagamento aprovado mas plano não encontrado",
      html: `<p>Pagamento <b>${mpPaymentId}</b> aprovado para usuário <b>${userId}</b> mas plano <b>${planId}</b> não foi encontrado no banco. Ative a assinatura manualmente.</p>`,
    }).catch(() => {}); // silencioso — não pode derrubar o webhook
    throw new Error(`Plano não encontrado: ${planId}`);
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.intervalDays);
  const now = new Date().toISOString();

  // Segunda barreira de idempotência dentro da função (protege contra race condition)
  const { data: alreadyByPayment } = await db.from("Subscription")
    .select("id").eq("mpPaymentId", mpPaymentId).eq("status", "ACTIVE").maybeSingle();
  if (alreadyByPayment) return;

  const { data: existing } = await db.from("Subscription").select("id").eq("userId", userId).maybeSingle();

  if (existing) {
    await db.from("Subscription").update({
      planId, status: "ACTIVE",
      startDate: now,
      endDate: endDate.toISOString(),
      mpPaymentId,
      updatedAt: now,
    }).eq("id", existing.id);
  } else {
    await db.from("Subscription").insert({
      id: crypto.randomUUID(),
      userId, planId, status: "ACTIVE",
      startDate: now,
      endDate: endDate.toISOString(),
      mpPaymentId,
      createdAt: now, updatedAt: now,
    });
  }
}

async function cancelSubscription(userId: string, reason: string) {
  const { data: existing } = await db.from("Subscription").select("id").eq("userId", userId).maybeSingle();
  if (existing) {
    await db.from("Subscription").update({
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    }).eq("id", existing.id);
  }
  await log("subscription_cancelled", { userId, reason });
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let rawBody = "";
  try {
    rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verificação de assinatura
    if (!verifySignature(req, rawBody)) {
      await log("signature_invalid", { headers: Object.fromEntries(req.headers) });
      slog.security(LogEvent.PAYMENT_WEBHOOK, { result: "signature_invalid" });
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    const eventType: string = body.type ?? body.action ?? "";
    await log(eventType, body);

    // ── Evento: pagamento ──────────────────────────────────────────────────────
    if (eventType === "payment") {
      const paymentApi = new Payment(getMPInstance());
      const paymentData = await paymentApi.get({ id: body.data?.id ?? body.data_id });

      const status = paymentData.status;
      const externalRef = paymentData.external_reference ?? "";
      const [userId, planId] = externalRef.split("|");

      if (!userId || !planId) {
        await log("payment_no_ref", { paymentId: paymentData.id });
        return NextResponse.json({ ok: true });
      }

      if (status === "approved") {
        // Idempotência: verifica se este pagamento já foi processado
        const mpPaymentIdStr = String(paymentData.id);
        const { data: alreadyProcessed } = await db
          .from("Subscription")
          .select("id")
          .eq("mpPaymentId", mpPaymentIdStr)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (alreadyProcessed) {
          await log("payment_duplicate_ignored", { userId, planId, paymentId: paymentData.id });
          return NextResponse.json({ ok: true });
        }

        await activateSubscription(userId, planId, mpPaymentIdStr);
        await log("payment_approved", { userId, planId, paymentId: paymentData.id });
        slog.info(LogEvent.PAYMENT_APPROVED, { userId, planId });
      } else if (status === "refunded" || status === "cancelled" || status === "charged_back") {
        await cancelSubscription(userId, `payment_${status}`);
      } else if (status === "pending" || status === "in_process") {
        // Atualiza para PENDING se ainda não tiver assinatura ativa
        const { data: sub } = await db.from("Subscription")
          .select("id, status").eq("userId", userId).single();
        if (!sub || sub.status !== "ACTIVE") {
          await db.from("Subscription").upsert({
            id: sub?.id ?? crypto.randomUUID(),
            userId, planId, status: "PENDING",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(), // +1 dia provisório
            mpPaymentId: String(paymentData.id),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { onConflict: "id" });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── Evento: subscription_authorized (assinatura recorrente ativada) ────────
    if (eventType === "subscription_authorized_payment" || eventType === "subscription_preapproval") {
      const subscriptionId = body.data?.id;
      if (subscriptionId) {
        // Busca último pagamento aprovado dessa assinatura via external_reference
        const externalRef = body.data?.external_reference ?? "";
        const [userId, planId] = externalRef.split("|");
        if (userId && planId) {
          await activateSubscription(userId, planId, subscriptionId);
          await log("subscription_renewed", { userId, planId, subscriptionId });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── Evento: merchant_order (agrupamento de pagamentos) ─────────────────────
    if (eventType === "merchant_order") {
      const orderApi = new MerchantOrder(getMPInstance());
      const order = await orderApi.get({ merchantOrderId: body.data?.id });
      const payments = (order.payments ?? []) as Array<{ status?: string | null; id?: number | null }>;
      const approved = payments.find((p) => p.status === "approved");
      if (approved && order.external_reference) {
        const [userId, planId] = (order.external_reference as string).split("|");
        if (userId && planId) {
          await activateSubscription(userId, planId, String(approved.id));
          await log("merchant_order_approved", { userId, planId, orderId: order.id });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Eventos não tratados — retorna OK para o MP não retentar
    return NextResponse.json({ ok: true });
  } catch (err) {
    await log("webhook_error", { raw: rawBody.slice(0, 500) }, String(err));
    slog.error(LogEvent.PAYMENT_FAILED, { stage: "webhook_processing" }, err);
    // Retorna 200 para evitar retentativas infinitas do MP
    return NextResponse.json({ ok: true });
  }
}

// GET: não permitido — evita expor informações de infraestrutura
export async function GET() {
  return new NextResponse(null, { status: 405 });
}
