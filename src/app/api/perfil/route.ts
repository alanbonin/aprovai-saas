import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

/**
 * GET /api/perfil
 * Retorna dados completos do perfil do aluno: info, stats, matérias inscritas.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  let ssQuery = db.from("StudentSubject").select("subjectId").eq("userId", dbUser.id);
  if (profileId) {
    ssQuery = ssQuery.eq("profileId", profileId);
  } else {
    ssQuery = ssQuery.is("profileId", null);
  }

  const [profileRes, progressRes, studentSubjectsRes, profileStatsRes] = await Promise.all([
    db.from("StudentProfile")
      .select("cargo, orgao, dataProva, dificuldades, streak, xp, lastStudyDate")
      .eq("userId", dbUser.id)
      .eq("id", profileId ?? "")
      .maybeSingle(),
    db.from("Progress")
      .select("correct", { count: "exact" })
      .eq("userId", dbUser.id),
    ssQuery,
    db.from("SimuladoHistory")
      .select("id", { count: "exact" })
      .eq("userId", dbUser.id),
  ]);

  const profile = profileRes.data;
  const totalAnswered = progressRes.count ?? 0;
  const totalCorrect = (progressRes.data ?? []).filter(p => p.correct).length;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const enrolledSubjectIds = (studentSubjectsRes.data ?? []).map(s => s.subjectId as string);
  const totalSimulados = profileStatsRes.count ?? 0;

  // Nível baseado em XP
  const xp = (profile?.xp as number) ?? 0;
  const LEVELS = [
    { name: "Calouro", min: 0, color: "#8b949e" },
    { name: "Estudioso", min: 201, color: "#60a5fa" },
    { name: "Focado", min: 501, color: "#818cf8" },
    { name: "Avançado", min: 1001, color: "#a78bfa" },
    { name: "Expert", min: 2001, color: "#fbbf24" },
    { name: "Elite", min: 4001, color: "#facc15" },
  ];
  const level = [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1] ?? null;
  const levelProgress = nextLevel
    ? Math.min(100, Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100))
    : 100;

  return NextResponse.json({
    name: dbUser.name ?? "",
    email: dbUser.email ?? "",
    cargo: profile?.cargo ?? "",
    orgao: profile?.orgao ?? "",
    dataProva: profile?.dataProva ?? null,
    dificuldades: profile?.dificuldades ?? "",
    streak: (profile?.streak as number) ?? 0,
    xp,
    level,
    nextLevel,
    levelProgress,
    totalAnswered,
    totalCorrect,
    accuracy,
    totalSimulados,
    enrolledSubjectIds,
  });
}

/**
 * PATCH /api/perfil
 * Atualiza cargo, orgao, dataProva, dificuldades do StudentProfile.
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as {
    cargo?: string;
    orgao?: string;
    dataProva?: string | null;
    dificuldades?: string;
  };

  await db.from("StudentProfile").upsert(
    {
      userId: dbUser.id,
      ...(body.cargo !== undefined && { cargo: body.cargo }),
      ...(body.orgao !== undefined && { orgao: body.orgao }),
      ...(body.dataProva !== undefined && { dataProva: body.dataProva }),
      ...(body.dificuldades !== undefined && { dificuldades: body.dificuldades }),
    },
    { onConflict: "userId" }
  );

  return NextResponse.json({ ok: true });
}
