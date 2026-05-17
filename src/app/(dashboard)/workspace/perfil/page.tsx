import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { PerfilClient } from "./perfil-client";

const LEVELS = [
  { name: "Calouro",      min: 0,     color: "text-gray-400" },
  { name: "Estudioso",    min: 200,   color: "text-green-400" },
  { name: "Comprometido", min: 600,   color: "text-blue-400" },
  { name: "Dedicado",     min: 1200,  color: "text-indigo-400" },
  { name: "Avançado",     min: 2500,  color: "text-purple-400" },
  { name: "Expert",       min: 5000,  color: "text-amber-400" },
  { name: "Mestre",       min: 9000,  color: "text-orange-400" },
  { name: "Aprovado",     min: 15000, color: "text-yellow-400" },
];

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dbUser } = await db
    .from("User")
    .select("id, name, role")
    .eq("supabaseId", user.id)
    .single();
  if (!dbUser) redirect("/login");
  if (dbUser.role === "ADMIN") redirect("/admin");

  const [{ data: profile }, { count: totalQuestoes }, { data: progresso }] = await Promise.all([
    db.from("StudentProfile")
      .select("cargo, orgao, dataProva, dificuldades, streak, xp, onboardingDone")
      .eq("userId", dbUser.id)
      .single(),
    db.from("Progress")
      .select("*", { count: "exact", head: true })
      .eq("userId", dbUser.id),
    db.from("Progress")
      .select("correct")
      .eq("userId", dbUser.id),
  ]);

  const totalRespondidas = totalQuestoes ?? 0;
  const totalAcertos     = (progresso ?? []).filter(p => p.correct).length;
  const accuracy         = totalRespondidas > 0
    ? Math.round((totalAcertos / totalRespondidas) * 100)
    : 0;

  const xp = profile?.xp ?? 0;
  const level     = [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1] ?? null;
  const levelProgress = nextLevel
    ? Math.min(100, Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100))
    : 100;

  return (
    <PerfilClient
      name={dbUser.name ?? ""}
      email={user.email ?? ""}
      cargo={profile?.cargo ?? ""}
      orgao={profile?.orgao ?? ""}
      dataProva={profile?.dataProva ?? ""}
      dificuldades={profile?.dificuldades ?? ""}
      streak={profile?.streak ?? 0}
      xp={xp}
      levelName={level.name}
      levelColor={level.color}
      levelProgress={levelProgress}
      nextLevelName={nextLevel?.name ?? null}
      totalQuestoes={totalRespondidas}
      accuracy={accuracy}
    />
  );
}
