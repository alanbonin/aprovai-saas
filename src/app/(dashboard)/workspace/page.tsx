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

  // Agentes selecionados pelo aluno
  const { data: userAgents } = await db
    .from("UserAgent")
    .select("agentId")
    .eq("userId", dbUser.id);

  if (!userAgents || userAgents.length === 0) {
    redirect("/mentor");
  }

  const agentIds = userAgents.map((ua: { agentId: string }) => ua.agentId);
  const { data: agents } = await db
    .from("Agent")
    .select("*")
    .in("id", agentIds)
    .eq("active", true);

  // Perfil de estudo do aluno
  const { data: profile } = await db
    .from("StudentProfile")
    .select("*")
    .eq("userId", dbUser.id)
    .single();

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

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weeklyLimit = dbUser.subscription?.plan?.aiCreditsPerWeek ?? 5;

  return (
    <WorkspaceShell
      agents={agents ?? []}
      profile={profile}
      subjects={subjects}
      userId={dbUser.id}
      aiCreditsTotal={weeklyLimit}
    />
  );
}
