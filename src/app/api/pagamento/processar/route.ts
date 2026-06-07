import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";
import MercadoPago, { Payment } from "mercadopago";
import { log, LogEvent } from "@/lib/logger";

function getMp() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPago({ accessToken: token });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await req.json() as Record<string, any>;

    const mp = getMp();
    const paymentApi = new Payment(mp);

    const payment = await paymentApi.create({
      body: {
        ...body,
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
