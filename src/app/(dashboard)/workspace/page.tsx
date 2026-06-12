export const dynamic = "force-dynamic"; // nunca cachear — dados mudam a cada questão respondida

import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { CATEGORIAS } from "@/lib/agents";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  // Admin não tem workspace de aluno — vai para o painel admin
  if (dbUser.role === "ADMIN") redirect("/admin");

  // Perfil ATIVO do aluno (respeita activeProfileId → isDefault → primeiro)
  let activeProfile = await getActiveProfile(dbUser.id);

  // Fallback: se o perfil ativo não tem onboardingDone (ex: perfil novo sem onboarding),
  // busca qualquer perfil do usuário que já tenha onboarding completo
  if (!activeProfile?.onboardingDone) {
    const { data: fallback } = await db
      .from("StudentProfile")
      .select("*")
      .eq("userId", dbUser.id)
      .eq("onboardingDone", true)
      .order("isDefault", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallback) activeProfile = fallback as typeof activeProfile;
  }

  const profile = activeProfile;

  // Primeiro acesso sem onboarding → redireciona para a experiência de onboarding
  if (!profile?.onboardingDone) redirect("/onboarding");

  // Todos os agentes ativos + IDs dos agentes do perfil — em paralelo
  const userAgentQuery = activeProfile
    ? db.from("UserAgent").select("agentId").eq("userId", dbUser.id).eq("profileId", activeProfile.id)
    : db.from("UserAgent").select("agentId").eq("userId", dbUser.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: allAgentsRaw }, { data: userAgentRows }] = await Promise.all([
    // Somente agentes de cargo (sem banca específica)
    db.from("Agent").select("*").eq("active", true).is("banca", null).order("name"),
    userAgentQuery,
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allAgents: any[] = allAgentsRaw ?? [];
  let activeAgentIds = (userAgentRows ?? []).map((ua: { agentId: string }) => ua.agentId);

  // Auto-atribui mentor baseado no cargo do perfil ativo
  if (activeProfile) {
    const cargo = (activeProfile as unknown as { cargo?: string }).cargo ?? "";
    if (cargo) {
      // Encontra a categoria que contém esse cargo
      const categoriaMatch = CATEGORIAS.find(cat =>
        cat.cargos.some(c => cargo.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(cargo.toLowerCase()))
      );
      if (categoriaMatch) {
        // Encontra o agente com essa categoria
        const agentMatch = allAgents.find((a: { categoria?: string }) => a.categoria === categoriaMatch.id);
        if (agentMatch && !activeAgentIds.includes(agentMatch.id)) {
          // Auto-adiciona o mentor
          await db.from("UserAgent").upsert(
            { id: crypto.randomUUID(), userId: dbUser.id, agentId: agentMatch.id, profileId: activeProfile.id, createdAt: new Date().toISOString() },
            { onConflict: "userId,agentId", ignoreDuplicates: true }
          );
          activeAgentIds = [...activeAgentIds, agentMatch.id];
        }
      }
    }
  }

  // Agentes do perfil ativo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agents: any[] = [];
  if (activeAgentIds.length > 0) {
    agents = allAgents.filter((a: { id: string }) => activeAgentIds.includes(a.id));
  }

  // Matérias do perfil ativo (filtra por profileId)
  let subjects: { id: string; name: string; slug: string }[] = [];
  if (profile?.onboardingDone && activeProfile) {
    // Matérias exclusivas do perfil ativo
    const { data: studentSubjects } = await db.from("StudentSubject")
      .select("subjectId, Subject(id, name, slug, description)")
      .eq("userId", dbUser.id)
      .eq("profileId", activeProfile.id);

    // Fallback: legadas só se o perfil não tiver matérias próprias
    let allSubs = studentSubjects ?? [];
    if (allSubs.length === 0) {
      const { data: legacySubjects } = await db.from("StudentSubject")
        .select("subjectId, Subject(id, name, slug, description)")
        .eq("userId", dbUser.id)
        .is("profileId", null);
      allSubs = legacySubjects ?? [];
    }
    const seen = new Set<string>();
    subjects = allSubs
      .map((ss: { subjectId: string; Subject: unknown }) => {
        const s = ss.Subject as { id: string; name: string; slug: string; description: string }[] | null;
        return Array.isArray(s) ? s[0] : s;
      })
      .filter((s): s is NonNullable<typeof s> => {
        if (!s || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      }) as { id: string; name: string; slug: string }[];
  }

  // Verifica expiração em tempo real (o cron roda às 6h, pode haver atraso)
  const sub = dbUser.subscription;
  const isExpired = !sub || (sub.endDate && new Date(sub.endDate) < new Date());

  // ── Bloqueia acesso ao workspace quando assinatura expirada ──────────────
  // Banner não é suficiente — usuário consegue responder questões sem salvar progresso
  if (isExpired) redirect("/planos?expired=1");

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
