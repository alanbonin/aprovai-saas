import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db
      .from("User")
      .select("id, subscriptionId")
      .eq("supabaseId", user.id)
      .single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Planos ativos
    const { data: plans } = await db
      .from("Plan")
      .select("id, name, slug, price, intervalDays, aiCreditsPerWeek, features, active")
      .eq("active", true)
      .order("price");

    // Assinatura atual
    const { data: sub } = await db
      .from("Subscription")
      .select("planId")
      .eq("userId", dbUser.id)
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      plans: plans ?? [],
      currentPlanId: sub?.planId ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
