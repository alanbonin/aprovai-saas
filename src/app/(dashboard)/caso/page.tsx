import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";
import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { CasoClient } from "./caso-client";

export default async function CasoPage() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Estudo de Caso" desc="Resolva casos práticos com avaliação detalhada por IA. Disponível nos planos pagos." icon="🔍" />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  return <CasoClient />;
}
