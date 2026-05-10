import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MentorChat } from "@/components/mentor/mentor-chat";
import { AREAS, BANCAS } from "@/lib/agents";

export default async function MentorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { subscription: { include: { plan: true } } },
  });
  if (!dbUser) redirect("/login");

  const agents = await prisma.agent.findMany({
    where: { active: true },
    orderBy: [{ area: "asc" }, { banca: "asc" }],
  });

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const totalUsed = await prisma.aiUsage.aggregate({
    where: { userId: dbUser.id, weekStart },
    _sum: { count: true },
  });

  const weeklyLimit = dbUser.subscription?.plan.aiCreditsPerWeek ?? 5;
  const usedCount = totalUsed._sum.count ?? 0;
  const remaining = Math.max(0, weeklyLimit - usedCount);

  return (
    <MentorChat
      agents={agents}
      areas={AREAS}
      bancas={BANCAS}
      aiCreditsLeft={remaining}
      aiCreditsTotal={weeklyLimit}
      userId={dbUser.id}
    />
  );
}
