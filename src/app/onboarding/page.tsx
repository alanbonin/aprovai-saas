import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/onboarding");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  // Admin → painel admin
  if (dbUser.role === "ADMIN") redirect("/admin");

  // Se onboarding já foi feito → workspace
  const { data: profile } = await db
    .from("StudentProfile")
    .select("onboardingDone")
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (profile?.onboardingDone) redirect("/workspace");

  // maxAgents do plano do aluno (Trial = 1, planos maiores = mais)
  const maxConcursos = (dbUser as { subscription?: { plan?: { maxAgents?: number } } })
    ?.subscription?.plan?.maxAgents ?? 1;

  // Agentes disponíveis para o sistema de seleção
  const { data: allAgents } = await db
    .from("Agent")
    .select("id, name, description, categoria, banca, color")
    .eq("active", true)
    .order("name");

  return (
    <OnboardingClient
      userId={dbUser.id}
      userName={dbUser.name ?? user.email?.split("@")[0] ?? ""}
      agents={allAgents ?? []}
      maxConcursos={maxConcursos}
    />
  );
}
