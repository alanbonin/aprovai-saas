import { createClient } from "@supabase/supabase-js";

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Busca usuário completo com plano
// Verifica endDate em tempo real para não depender do cron de expiração
export async function getUserWithPlan(supabaseId: string) {
  const { data: user } = await db.from("User").select("*").eq("supabaseId", supabaseId).single();
  if (!user) return null;

  const { data: subscription } = await db
    .from("Subscription")
    .select("*")
    .eq("userId", user.id)
    .eq("status", "ACTIVE")
    .single();

  // Verifica expiração real-time (o cron marca como EXPIRED às 6h, pode haver lag)
  const isExpired = subscription
    ? new Date(subscription.endDate) < new Date()
    : true;

  const plan = subscription && !isExpired
    ? (await db.from("Plan").select("*").eq("id", subscription.planId).single()).data
    : null;

  return {
    ...user,
    subscription: subscription && !isExpired
      ? { ...subscription, plan }
      : null,
  };
}

// Soma uso de IA na semana
export async function getWeeklyAiUsage(userId: string, weekStart: string) {
  const { data } = await db.from("AiUsage").select("count").eq("userId", userId).eq("weekStart", weekStart);
  return (data ?? []).reduce((sum: number, r: { count: number }) => sum + r.count, 0);
}
