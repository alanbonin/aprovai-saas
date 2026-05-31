import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

/**
 * GET /api/relatorio/evolucao
 * Retorna a evolução semanal de acertos do aluno nas últimas 12 semanas,
 * agrupada por matéria (top 5) e global.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Últimas 12 semanas
  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  // Busca progresso com data — isolado por perfil ativo
  let progressQuery = db.from("Progress").select("questionId, correct, createdAt")
    .eq("userId", dbUser.id)
    .gte("createdAt", twelveWeeksAgo.toISOString())
    .order("createdAt", { ascending: true });
  if (profileId) progressQuery = progressQuery.eq("profileId", profileId);
  const { data: progress } = await progressQuery;

  if (!progress?.length) {
    return NextResponse.json({ semanas: [], materias: [] });
  }

  // Busca questões para pegar subjectId
  const qIds = [...new Set(progress.map(p => p.questionId))];
  const { data: questions } = await db.from("Question").select("id, subjectId").in("id", qIds);
  const qSubjectMap: Record<number, string> = {};
  for (const q of questions ?? []) qSubjectMap[q.id] = q.subjectId;

  // Busca top 5 matérias por quantidade de respostas
  const subjectCount: Record<string, number> = {};
  for (const p of progress) {
    const sid = qSubjectMap[p.questionId];
    if (sid) subjectCount[sid] = (subjectCount[sid] ?? 0) + 1;
  }
  const top5SubjectIds = Object.entries(subjectCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const { data: subjects } = top5SubjectIds.length
    ? await db.from("Subject").select("id, name").in("id", top5SubjectIds)
    : { data: [] };
  const subjectNames: Record<string, string> = {};
  for (const s of subjects ?? []) subjectNames[s.id] = s.name;

  // Gera labels de semanas (ISO week start, segunda)
  function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // segunda
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  // Agrupa progresso por semana
  interface WeekStats {
    total: number; correct: number;
    bySubject: Record<string, { total: number; correct: number }>;
  }
  const weekMap: Record<string, WeekStats> = {};

  for (const p of progress) {
    const week = getWeekStart(new Date(p.createdAt));
    if (!weekMap[week]) weekMap[week] = { total: 0, correct: 0, bySubject: {} };
    weekMap[week].total++;
    if (p.correct) weekMap[week].correct++;

    const sid = qSubjectMap[p.questionId];
    if (sid && top5SubjectIds.includes(sid)) {
      if (!weekMap[week].bySubject[sid]) weekMap[week].bySubject[sid] = { total: 0, correct: 0 };
      weekMap[week].bySubject[sid].total++;
      if (p.correct) weekMap[week].bySubject[sid].correct++;
    }
  }

  // Garante que todas as 12 semanas estão presentes (mesmo sem dados)
  const allWeeks: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    allWeeks.push(getWeekStart(d));
  }
  const uniqueWeeks = [...new Set(allWeeks)];

  const semanas = uniqueWeeks.map(week => {
    const s = weekMap[week];
    const accuracy = s?.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
    const bySubject: Record<string, number | null> = {};
    for (const sid of top5SubjectIds) {
      const sub = s?.bySubject[sid];
      bySubject[sid] = sub?.total ? Math.round((sub.correct / sub.total) * 100) : null;
    }
    return { week, total: s?.total ?? 0, correct: s?.correct ?? 0, accuracy, bySubject };
  });

  const materias = top5SubjectIds.map(id => ({
    id,
    name: subjectNames[id] ?? id,
    color: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][top5SubjectIds.indexOf(id) % 5],
  }));

  return NextResponse.json({ semanas, materias });
}
