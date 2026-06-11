import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { PomodoroFloat } from "@/components/layout/pomodoro-float";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { PushAutoPrompt } from "@/components/layout/push-auto-prompt";
import { SessionGuard } from "@/components/layout/session-guard";
import { ThemeWelcome } from "@/components/layout/theme-welcome";
import { UpgradeModalProvider } from "@/components/ui/upgrade-modal-context";
import { getConfig } from "@/lib/system-config";
import { getWeekStartStr } from "@/lib/api-utils";
import { getAccessLevel } from "@/lib/access";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  // Admin vai direto para o painel admin
  if (dbUser.role === "ADMIN") redirect("/admin");

  const sub = dbUser.subscription;
  const rawTotal = sub?.plan?.aiCreditsPerWeek ?? 10;
  const aiCreditsTotal = rawTotal === -1 || rawTotal >= 9999 ? 9999 : rawTotal;

  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  const weekStart = d.toISOString().slice(0, 10);

  const weekStartStr = getWeekStartStr();

  async function getWeeklyUsage(resource: string) {
    const { data } = await db.from("WeeklyUsage").select("count")
      .eq("userId", dbUser!.id).eq("resource", resource).eq("weekStart", weekStartStr).maybeSingle();
    return (data as { count: number } | null)?.count ?? 0;
  }

  // Paraleliza todas as queries independentes
  const [profileRes, aiUsed, bannerGlobal, modoManutencao,
    usedCasos, usedRedacoes, usedSimulados, usedQuestoes, usedFlashcards, usedPdf,
    access
  ] = await Promise.all([
    Promise.resolve(db.from("StudentProfile").select("id").eq("userId", dbUser.id).eq("onboardingDone", true).limit(1))
      .then(r => r.data).catch(() => null),
    getWeeklyAiUsage(dbUser.id as string, weekStart).catch(() => 0),
    getConfig("geral.banner_global").catch(() => null),
    getConfig("geral.modo_manutencao").catch(() => null),
    getWeeklyUsage("caso").catch(() => 0),
    getWeeklyUsage("redacao").catch(() => 0),
    getWeeklyUsage("simulado").catch(() => 0),
    getWeeklyUsage("questoes").catch(() => 0),
    getWeeklyUsage("flashcards").catch(() => 0),
    getWeeklyUsage("pdf").catch(() => 0),
    getAccessLevel().catch(() => null),
  ]);

  // Verifica onboarding — alunos sem perfil completo vão para /onboarding
  if (profileRes !== null && profileRes.length === 0) redirect("/onboarding");

  const aiCreditsLeft = aiCreditsTotal >= 9999 ? 9999 : Math.max(0, aiCreditsTotal - (aiUsed as number));

  // Busca nome do plano
  const planName = sub?.plan?.name ?? "Gratuito";

  // Verifica se é premium (plano pago OU cortesia/isento, não expirado, não trial)
  const isExpiredSub = !sub || (sub.endDate && new Date(sub.endDate) < new Date());
  const isTrial = (sub as { status?: string } | null)?.status === "TRIAL";
  const mpId = (sub as { mpPaymentId?: string } | null)?.mpPaymentId ?? "";
  const isCortesiaOrIsento = mpId.startsWith("CORTESIA:") || mpId === "ISENTO";
  const isPremium = !isExpiredSub && !isTrial && !!(sub && ((sub.plan?.price ?? 0) > 0 || isCortesiaOrIsento));

  // Calcula dias restantes do trial
  let trialDaysLeft: number | null = null;
  if (sub && (sub as { status?: string }).status === "TRIAL" && sub.endDate) {
    const diffMs = new Date(sub.endDate).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffMs / 86_400_000));
  }

  const usageLimits = {
    caso:       { used: usedCasos as number,      total: access?.maxCasosPerWeek      ?? 0 },
    redacao:    { used: usedRedacoes as number,    total: access?.maxRedacoesPerWeek   ?? 0 },
    simulado:   { used: usedSimulados as number,   total: access?.maxSimuladosPerWeek  ?? 0 },
    questoes:   { used: usedQuestoes as number,    total: access?.maxQuestionsPerWeek  ?? 0 },
    flashcards: { used: usedFlashcards as number,  total: access?.maxFlashcardsPerWeek ?? 0 },
    pdf:        { used: usedPdf as number,         total: access?.maxPdfPerWeek        ?? 0 },
  };

  return (
    <UpgradeModalProvider>
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar
        userName={dbUser.name ?? undefined}
        planName={planName}
        avatarUrl={(dbUser as unknown as { avatarUrl?: string | null }).avatarUrl ?? null}
        aiCreditsLeft={aiCreditsLeft}
        aiCreditsTotal={aiCreditsTotal}
        isPremium={isPremium}
        trialDaysLeft={trialDaysLeft}
        usageLimits={usageLimits}
      />
      {/* pt-12 no mobile reserva espaço para o header fixo do sidebar (lg:hidden, h-12) */}
      <div className="flex-1 min-w-0 flex flex-col pt-12 lg:pt-0">
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
      <main className="flex-1 min-w-0 overflow-auto pb-4 lg:pb-4" style={{ backgroundColor: "var(--bg-base)", paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
        {children}
      </main>
      <AutoRefresh />
      <PomodoroFloat />
      <PushAutoPrompt />
      <SessionGuard />
      <ThemeWelcome />
      </div>
    </div>
    </UpgradeModalProvider>
  );
}
