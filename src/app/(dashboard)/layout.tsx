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

  // Admin vai direto para o painel admin
  if (dbUser.role === "ADMIN") redirect("/admin");

  // Busca créditos de IA da semana
  const aiCreditsTotal = 10;
  let aiCreditsLeft = aiCreditsTotal;
  try {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    const weekStart = d.toISOString().slice(0, 10);
    const used = await getWeeklyAiUsage(dbUser.id as string, weekStart);
    aiCreditsLeft = Math.max(0, aiCreditsTotal - used);
  } catch { /* silent */ }

  // Busca nome do plano
  const planName = (dbUser as { subscription?: { plan?: { name?: string } } })
    ?.subscription?.plan?.name ?? "Gratuito";

  return (
    <div className="flex min-h-screen bg-[#080c18]">
      <Sidebar
        userName={dbUser.name ?? undefined}
        planName={planName}
        aiCreditsLeft={aiCreditsLeft}
        aiCreditsTotal={aiCreditsTotal}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
