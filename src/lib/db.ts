import { createClient } from "@supabase/supabase-js";

// Server-side: usa SUPABASE_URL (não é inlinada pelo Turbopack como NEXT_PUBLIC_*)
// Fallback para NEXT_PUBLIC_SUPABASE_URL em ambientes locais
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const db = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Busca usuário completo com plano
// Verifica endDate em tempo real para não depender do cron de expiração
export async function getUserWithPlan(supabaseId: string) {
  const { data: user } = await db.from("User").select("*").eq("supabaseId", supabaseId).maybeSingle();
  if (!user) return null;

  const { data: subscriptions } = await db
    .from("Subscription")
    .select("*, plan:planId(*)")
    .eq("userId", user.id)
    .not("status", "in", '("CANCELLED","EXPIRED")')
    .order("createdAt", { ascending: false })
    .limit(1);
  const subscription = subscriptions?.[0] ?? null;

  const isExpired = subscription
    ? new Date((subscription as { endDate: string }).endDate) < new Date()
    : true;

  return {
    ...user,
    subscription: subscription && !isExpired ? subscription : null,
  };
}

// Soma uso de IA na semana
export async function getWeeklyAiUsage(userId: string, weekStart: string) {
  const { data } = await db.from("AiUsage").select("count").eq("userId", userId).eq("weekStart", weekStart);
  return (data ?? []).reduce((sum: number, r: { count: number }) => sum + r.count, 0);
}
