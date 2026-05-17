import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/analytics
 * Métricas de uso da plataforma para o painel admin.
 *
 * Retorna:
 * - dau: usuários ativos por dia (últimos 30 dias)
 * - topSubjects: matérias com mais questões respondidas
 * - conversao: free vs paid users
 * - retencao: alunos com assinatura ativa vs inativos há 7d+
 * - questoesPerDay: média de questões por dia ativo
 */

async function getAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await db.from("User").select("role").eq("id", user.id).single();
  return data?.role === "ADMIN";
}

export async function GET() {
  const isAdmin = await getAdminUser();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo  = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [
    progressRecentRes,
    allSubjectsRes,
    allUsersRes,
    activeSubs,
  ] = await Promise.all([
    db.from("Progress").select("userId, questionId, createdAt").gte("createdAt", thirtyDaysAgo),
    db.from("Subject").select("id, name, categoria"),
    db.from("User").select("id, createdAt, role").eq("role", "STUDENT"),
    db.from("Subscription").select("userId, status").eq("status", "ACTIVE"),
  ]);

  const progress = progressRecentRes.data ?? [];
  const subjects = allSubjectsRes.data ?? [];
  const users    = allUsersRes.data ?? [];
  const subs     = activeSubs.data ?? [];

  // ── DAU: unique users per day (last 30 days) ──────────────────────────
  const dauMap: Record<string, Set<string>> = {};
  for (const p of progress) {
    const day = (p.createdAt as string).slice(0, 10);
    if (!dauMap[day]) dauMap[day] = new Set();
    dauMap[day].add(p.userId as string);
  }

  // Fill all 30 days (even zeros)
  const dau: { date: string; users: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dau.push({ date: key, users: dauMap[key]?.size ?? 0 });
  }

  // ── Top Subjects ──────────────────────────────────────────────────────
  // Build questionId → subjectId from Question table using a single lookup
  const questionIds = [...new Set(progress.map(p => p.questionId as number))];
  let topSubjects: { subjectId: string; name: string; categoria: string | null; count: number }[] = [];

  if (questionIds.length > 0) {
    // Batch in groups of 500 to avoid URL limits
    const allQuestions: { id: number; subjectId: string | null }[] = [];
    for (let i = 0; i < questionIds.length; i += 500) {
      const batch = questionIds.slice(i, i + 500);
      const { data } = await db.from("Question").select("id, subjectId").in("id", batch);
      allQuestions.push(...(data ?? []));
    }

    const qSubjectMap: Record<number, string> = {};
    for (const q of allQuestions) {
      if (q.subjectId) qSubjectMap[q.id] = q.subjectId;
    }

    const subjectCount: Record<string, number> = {};
    for (const p of progress) {
      const sid = qSubjectMap[p.questionId as number];
      if (sid) subjectCount[sid] = (subjectCount[sid] ?? 0) + 1;
    }

    topSubjects = Object.entries(subjectCount)
      .map(([sid, count]) => {
        const s = subjects.find(s => s.id === sid);
        return { subjectId: sid, name: s?.name ?? sid, categoria: s?.categoria ?? null, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // ── Conversão: free vs paid ───────────────────────────────────────────
  const activeSubUserIds = new Set(subs.map(s => s.userId as string));
  const totalStudents = users.length;
  const paidStudents  = users.filter(u => activeSubUserIds.has(u.id)).length;
  const freeStudents  = totalStudents - paidStudents;
  const conversionPct = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0;

  // ── Retenção: ativos com sub vs inativos ─────────────────────────────
  const { data: recentProg } = await db
    .from("Progress")
    .select("userId")
    .gte("createdAt", sevenDaysAgo);
  const activeUserIds = new Set((recentProg ?? []).map(p => p.userId as string));
  const activeWithSub = subs.filter(s => activeUserIds.has(s.userId as string)).length;
  const inactiveWithSub = subs.length - activeWithSub;

  // ── Questões médias por dia ───────────────────────────────────────────
  const activeDays = dau.filter(d => d.users > 0).length;
  const avgQPerDay = activeDays > 0 ? Math.round(progress.length / activeDays) : 0;

  // ── Novos alunos por semana (últimas 8 semanas) ───────────────────────
  const newUsersPerWeek: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd   = new Date(now.getTime() - i * 7 * 86400000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
    const count = users.filter(u => {
      const created = new Date(u.createdAt as string);
      return created >= weekStart && created < weekEnd;
    }).length;
    newUsersPerWeek.push({
      week: weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      count,
    });
  }

  return NextResponse.json({
    dau,
    topSubjects,
    conversao: { total: totalStudents, paid: paidStudents, free: freeStudents, pct: conversionPct },
    retencao: { activeWithSub, inactiveWithSub, total: subs.length },
    avgQPerDay,
    newUsersPerWeek,
  });
}
