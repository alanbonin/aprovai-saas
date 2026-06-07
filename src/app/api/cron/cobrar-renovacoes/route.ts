import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import MercadoPago, { Payment } from "mercadopago";
import { log, LogEvent } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";

/**
 * GET /api/cron/cobrar-renovacoes
 * Roda diariamente às 06:30. Cobra automaticamente assinaturas ACTIVE
 * que expiram em até 3 dias e têm mpCustomerId + mpCardId salvos.
 */

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getMp() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPago({ accessToken: token });
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  // Busca assinaturas ativas com cartão salvo que expiram em até 3 dias
  const { data: subs } = await db
    .from("Subscription")
    .select("id, userId, planId, endDate, mpCustomerId, mpCardId, Plan(price, name, intervalDays, slug), User(email, name)")
    .eq("status", "ACTIVE")
    .not("mpCustomerId", "is", null)
    .not("mpCardId", "is", null)
    .lte("endDate", in3Days)
    .gte("endDate", now.toISOString());

  if (!subs?.length) return NextResponse.json({ ok: true, cobrados: 0, erros: 0 });

  const mp = getMp();
  const paymentApi = new Payment(mp);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aprovai360.com.br";

  let cobrados = 0;
  let erros = 0;

  for (const sub of subs) {
    const plan = (sub.Plan as unknown) as { price: number; name: string; intervalDays: number; slug: string } | null;
    const user = (sub.User as unknown) as { email: string; name: string } | null;
    if (!plan || !user) continue;

    try {
      const payment = await paymentApi.create({
        body: {
          transaction_amount: plan.price,
          token: sub.mpCardId,
          description: `AprovAI360 — ${plan.name} (renovação)`,
          installments: 1,
          payment_method_id: "master", // será sobrescrito pelo token
          payer: {
            type: "customer",
            id: sub.mpCustomerId,
            email: user.email,
          },
          external_reference: `${sub.userId}|${sub.planId}`,
          notification_url: `${appUrl}/api/pagamento/webhook`,
          statement_descriptor: "APROVAI360",
          metadata: { userId: sub.userId, renewal: true },
        },
        requestOptions: {
          idempotencyKey: `renewal-${sub.id}-${now.toISOString().slice(0, 10)}`,
        },
      });

      if (payment.status === "approved") {
        const newEnd = new Date(sub.endDate);
        newEnd.setDate(newEnd.getDate() + plan.intervalDays);

        await db.from("Subscription").update({
          endDate: newEnd.toISOString(),
          mpPaymentId: String(payment.id),
          updatedAt: new Date().toISOString(),
        }).eq("id", sub.id);

        log.info(LogEvent.PAYMENT_APPROVED, { userId: sub.userId, planId: sub.planId, renewal: true });
        cobrados++;
      } else {
        // Pagamento não aprovado — notifica o aluno
        await sendEmail({
          to: user.email,
          subject: "⚠️ Problema na renovação da sua assinatura AprovAI360",
          html: `<p>Olá ${user.name.split(" ")[0]}, houve um problema ao renovar sua assinatura (${plan.name}). Acesse <a href="${appUrl}/planos">seus planos</a> para atualizar o método de pagamento.</p>`,
        }).catch(() => {});
        erros++;
      }
    } catch (e) {
      log.error(LogEvent.PAYMENT_FAILED, { stage: "cobrar_renovacao", userId: sub.userId }, e);
      erros++;
    }
  }

  return NextResponse.json({ ok: true, cobrados, erros, total: subs.length });
}
