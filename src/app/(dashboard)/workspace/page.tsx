import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  // Admin não tem workspace de aluno — vai para o painel admin
  if (dbUser.role === "ADMIN") redirect("/admin");

  // Perfil de estudo (buscado antes para decidir quais agentes carregar)
  const { data: profile } = await db
    .from("StudentProfile")
    .select("*")
    .eq("userId", dbUser.id)
    .single();

  // Todos os agentes ativos (para o seletor do mentor)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allAgentsRaw } = await db.from("Agent").select("*").eq("active", true).order("name");
  const allAgents: any[] = allAgentsRaw ?? [];

  // IDs dos agentes atualmente ativos para este aluno
  const { data: userAgentRows } = await db
    .from("UserAgent")
    .select("agentId")
    .eq("userId", dbUser.id);
  const activeAgentIds = (userAgentRows ?? []).map((ua: { agentId: string }) => ua.agentId);

  // Agentes usados no onboarding/chat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agents: any[] = [];
  if (!profile?.onboardingDone) {
    agents = allAgents;
  } else if (activeAgentIds.length > 0) {
    agents = allAgents.filter((a: { id: string }) => activeAgentIds.includes(a.id));
  }

  // Matérias do aluno (se onboarding completo)
  let subjects: { id: string; name: string; slug: string }[] = [];
  if (profile?.onboardingDone) {
    const { data: studentSubjects } = await db
      .from("StudentSubject")
      .select("subjectId, Subject(id, name, slug, description)")
      .eq("userId", dbUser.id);

    subjects = (studentSubjects ?? [])
      .map((ss: { subjectId: string; Subject: unknown }) => {
        const s = ss.Subject as { id: string; name: string; slug: string; description: string }[] | null;
        return Array.isArray(s) ? s[0] : s;
      })
      .filter(Boolean) as { id: string; name: string; slug: string }[];
  }

  // Verifica expiração em tempo real (o cron roda às 6h, pode haver atraso)
  const sub = dbUser.subscription;
  const isExpired = !sub || (sub.endDate && new Date(sub.endDate) < new Date());

  const weeklyLimit = isExpired ? 0 : (sub?.plan?.aiCreditsPerWeek ?? 5);
  // Mínimo 2 para que qualquer usuário possa combinar mentor de área + mentor de banca
  const maxAgents = isExpired ? 0 : Math.max(2, (sub?.plan as { maxAgents?: number } | null)?.maxAgents ?? 2);
  const isPremium = !isExpired && !!(sub && sub.status === "ACTIVE" && (sub.plan?.price ?? 0) > 0);

  return (
    <WorkspaceShell
      agents={agents ?? []}
      allAgents={allAgents}
      activeAgentIds={activeAgentIds}
      maxAgents={maxAgents}
      profile={profile}
      subjects={subjects}
      userId={dbUser.id}
      aiCreditsTotal={weeklyLimit}
      subscriptionEndDate={sub?.endDate ?? null}
      isPremium={isPremium}
      isExpired={isExpired}
    />
  );
}
