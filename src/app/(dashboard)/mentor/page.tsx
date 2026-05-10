import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import { redirect } from "next/navigation";
import { MentorChat } from "@/components/mentor/mentor-chat";
import { CATEGORIAS, BANCAS } from "@/lib/agents";

export default async function MentorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const [{ data: agents }, { data: userAgents }] = await Promise.all([
    db.from("Agent").select("*").eq("active", true).order("categoria"),
    db.from("UserAgent").select("agentId").eq("userId", dbUser.id),
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
      bancas={BANCAS}
      aiCreditsLeft={remaining}
      aiCreditsTotal={weeklyLimit}
      userId={dbUser.id}
      maxAgents={maxAgents}
      activeAgentIds={activeAgentIds}
    />
  );
}
