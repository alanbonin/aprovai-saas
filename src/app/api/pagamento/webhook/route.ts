import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import MercadoPago, { Payment } from "mercadopago";

const mp = new MercadoPago({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type !== "payment") return NextResponse.json({ ok: true });

  const payment = new Payment(mp);
  const paymentData = await payment.get({ id: body.data.id });

  if (paymentData.status !== "approved") return NextResponse.json({ ok: true });

  const [userId, planId] = (paymentData.external_reference ?? "").split("|");
  if (!userId || !planId) return NextResponse.json({ ok: true });

  const { data: plan } = await db.from("Plan").select("intervalDays").eq("id", planId).single();
  if (!plan) return NextResponse.json({ ok: true });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.intervalDays);

  const { data: existing } = await db.from("Subscription").select("id").eq("userId", userId).single();

  if (existing) {
    await db.from("Subscription").update({
      planId,
      status: "ACTIVE",
      startDate: new Date().toISOString(),
      endDate: endDate.toISOString(),
      mpPaymentId: String(paymentData.id),
      updatedAt: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await db.from("Subscription").insert({
      userId,
      planId,
      status: "ACTIVE",
      endDate: endDate.toISOString(),
      mpPaymentId: String(paymentData.id),
    });
  }

  return NextResponse.json({ ok: true });
}
