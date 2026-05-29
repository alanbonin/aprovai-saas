import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";
import { redirect } from "next/navigation";
import { MentorChat } from "@/components/mentor/mentor-chat";
import { CATEGORIAS } from "@/lib/agents";

export default async function MentorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  // Resolve o perfil ativo para filtrar agentes por perfil
  const activeProfile = await getActiveProfile(dbUser.id);

  // Busca agentes do perfil ativo — se profileId estiver disponível filtra por ele;
  // caso contrário (pré-migration) usa todos os UserAgent do usuário
  const userAgentsQuery = activeProfile
    ? db.from("UserAgent").select("agentId").eq("userId", dbUser.id).eq("profileId", activeProfile.id)
    : db.from("UserAgent").select("agentId").eq("userId", dbUser.id);

  const [{ data: agents }, { data: userAgents }] = await Promise.all([
    db.from("Agent").select("*").eq("active", true).order("name"),
    userAgentsQuery,
  ]);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weeklyLimit = dbUser.subscription?.plan?.aiCreditsPerWeek ?? 5;
  const usedCount = await getWeeklyAiUsage(dbUser.id, weekStart.toISOString());
  const remaining = Math.max(0, weeklyLimit - usedCount);
  const maxAgents = dbUser.subscription?.plan?.maxAgents ?? 1;
  const activeAgentIds = (userAgents ?? []).map((ua: { agentId: string }) => ua.agentId);

  return (
    <MentorChat
      agents={agents ?? []}
      categorias={CATEGORIAS}
      aiCreditsLeft={remaining}
      aiCreditsTotal={weeklyLimit}
      userId={dbUser.id}
      maxAgents={maxAgents}
      activeAgentIds={activeAgentIds}
    />
  );
}
