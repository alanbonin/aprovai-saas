import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      subscription: { include: { plan: true } },
    },
  });

  if (!dbUser) redirect("/login");

  // Cota de IA desta semana
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
    <div className="flex min-h-screen bg-[#080c18]">
      <Sidebar
        isAdmin={dbUser.role === "ADMIN"}
        userName={dbUser.name}
        planName={dbUser.subscription?.plan.name}
        aiCreditsLeft={remaining}
        aiCreditsTotal={weeklyLimit}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
