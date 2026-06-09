import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import MercadoPago, { PreApproval } from "mercadopago";
import { log, LogEvent } from "@/lib/logger";

function getMp() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPago({ accessToken: token });
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { data: sub } = await db
      .from("Subscription")
      .select("id, mpPaymentId, mpSubscriptionId, status")
      .eq("userId", dbUser.id)
      .maybeSingle();

    if (!sub) return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });

    // Cancela no Mercado Pago usando mpSubscriptionId (PreApproval ID)
    const mpSubId = sub.mpSubscriptionId ?? sub.mpPaymentId;
    if (mpSubId) {
      try {
        const preApprovalApi = new PreApproval(getMp());
        await preApprovalApi.update({
          id: mpSubId,
          body: { status: "cancelled" },
        });
      } catch (mpErr) {
        // Loga o erro do MP para auditoria; cancela no banco mesmo assim
        log.error(LogEvent.PAYMENT_FAILED, {
          stage: "mp_cancel_subscription",
          mpSubId,
          userId: dbUser.id,
        }, mpErr);
      }
    }

    // Cancela no banco — mantém endDate atual (acesso até fim do período)
    await db.from("Subscription").update({
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    }).eq("id", sub.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
