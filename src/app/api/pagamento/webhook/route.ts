import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ ok: true });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.intervalDays);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      status: "ACTIVE",
      endDate,
      mpPaymentId: String(paymentData.id),
    },
    update: {
      planId,
      status: "ACTIVE",
      startDate: new Date(),
      endDate,
      mpPaymentId: String(paymentData.id),
    },
  });

  return NextResponse.json({ ok: true });
}
