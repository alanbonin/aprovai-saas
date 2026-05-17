import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PlanosClient } from "./planos-client";

export default async function PlanosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const { data: plans } = await db
    .from("Plan")
    .select("*")
    .eq("active", true)
    .order("price");

  return (
    <PlanosClient
      plans={plans ?? []}
      currentPlanId={dbUser.subscription?.planId ?? null}
    />
  );
}
