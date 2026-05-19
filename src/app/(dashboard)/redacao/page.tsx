import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";
import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { RedacaoClient } from "./redacao-client";

export default async function RedacaoPage() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Redação com IA" desc="Treine redações e receba correção detalhada por IA especializada em concursos. Disponível nos planos pagos." icon="✍️" />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  return <RedacaoClient />;
}
