import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { PomodoroFloat } from "@/components/layout/pomodoro-float";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { UpgradeModalProvider } from "@/components/ui/upgrade-modal-context";
import { getConfig } from "@/lib/system-config";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  // Admin vai direto para o painel admin
  if (dbUser.role === "ADMIN") redirect("/admin");

  // Verifica onboarding — alunos sem perfil completo vão para /onboarding
  // Usa limit(1) para suportar múltiplos perfis (maybeSingle() falha com N>1 linhas)
  const { data: profileRows } = await db
    .from("StudentProfile")
    .select("id")
    .eq("userId", dbUser.id)
    .eq("onboardingDone", true)
    .limit(1);
  if (!profileRows || profileRows.length === 0) redirect("/onboarding");

  // Busca créditos de IA da semana — total vem do plano real
  const sub = dbUser.subscription;
  const rawTotal = sub?.plan?.aiCreditsPerWeek ?? 10;
  const aiCreditsTotal = rawTotal === -1 || rawTotal >= 9999 ? 9999 : rawTotal;
  let aiCreditsLeft = aiCreditsTotal;
  try {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    const weekStart = d.toISOString().slice(0, 10);
    const used = await getWeeklyAiUsage(dbUser.id as string, weekStart);
    aiCreditsLeft = aiCreditsTotal >= 9999 ? 9999 : Math.max(0, aiCreditsTotal - used);
  } catch { /* silent */ }

  // Busca nome do plano
  const planName = sub?.plan?.name ?? "Gratuito";

  // Verifica se é premium (plano pago e não expirado)
  const isExpiredSub = !sub || (sub.endDate && new Date(sub.endDate) < new Date());
  const isPremium = !isExpiredSub && !!(sub && (sub.plan?.price ?? 0) > 0);

  // Calcula dias restantes do trial
  let trialDaysLeft: number | null = null;
  if (sub && (sub as { status?: string }).status === "TRIAL" && sub.endDate) {
    const diffMs = new Date(sub.endDate).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffMs / 86_400_000));
  }

  // Banner global e modo manutenção
  const bannerGlobal = await getConfig("geral.banner_global");
  const modoManutencao = await getConfig("geral.modo_manutencao");

  return (
    <UpgradeModalProvider>
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar
        userName={dbUser.name ?? undefined}
        planName={planName}
        aiCreditsLeft={aiCreditsLeft}
        aiCreditsTotal={aiCreditsTotal}
        isPremium={isPremium}
        trialDaysLeft={trialDaysLeft}
      />
      <div className="flex-1 min-w-0 flex flex-col">
      {modoManutencao && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-2 text-center text-sm text-red-300 font-medium">
          🔧 Sistema em manutenção. Algumas funcionalidades podem estar indisponíveis.
        </div>
      )}
      {bannerGlobal && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-300">
          {String(bannerGlobal)}
        </div>
      )}
      {/* pb-16 no mobile reserva espaço para a barra de navegação inferior */}
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0" style={{ backgroundColor: "var(--bg-base)" }}>
        {children}
      </main>
      <AutoRefresh />
      <PomodoroFloat />
      </div>
    </div>
    </UpgradeModalProvider>
  );
}
