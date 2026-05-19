import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";

export const getAccessLevel = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isPremium: false };
    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return { isPremium: false };
    const sub = (dbUser as any).subscription;
    const isExpired = !sub || (sub.endDate && new Date(sub.endDate) < new Date());
    const isPremium = !isExpired && !!(sub && (sub.plan?.price ?? 0) > 0);
    return { isPremium };
  } catch {
    return { isPremium: false };
  }
});
