import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const usedCount = await getWeeklyAiUsage(dbUser.id, weekStart.toISOString());
  const weeklyLimit = dbUser.subscription?.plan?.aiCreditsPerWeek ?? 5;
  const remaining = Math.max(0, weeklyLimit - usedCount);

  return (
    <div className="flex min-h-screen bg-[#080c18]">
      <Sidebar
        isAdmin={dbUser.role === "ADMIN"}
        userName={dbUser.name}
        planName={dbUser.subscription?.plan?.name}
        aiCreditsLeft={remaining}
        aiCreditsTotal={weeklyLimit}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
