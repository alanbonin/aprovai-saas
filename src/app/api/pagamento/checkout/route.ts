import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import MercadoPago, { Preference } from "mercadopago";

const mp = new MercadoPago({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { planId } = await req.json();
  const { data: plan } = await db.from("Plan").select("*").eq("id", planId).single();
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  const preference = new Preference(mp);
  const response = await preference.create({
    body: {
      items: [{
        id: plan.id,
        title: `Aprovai — ${plan.name}`,
        quantity: 1,
        unit_price: plan.price,
        currency_id: "BRL",
      }],
      payer: { email: dbUser.email, name: dbUser.name },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/planos/sucesso`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/planos`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/planos/pendente`,
      },
      auto_return: "approved",
      external_reference: `${dbUser.id}|${plan.id}`,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pagamento/webhook`,
    },
  });

  return NextResponse.json({ checkoutUrl: response.init_point });
}
