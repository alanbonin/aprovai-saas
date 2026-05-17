import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/revisao/agenda
 * Retorna a agenda SM-2 dos próximos 14 dias:
 * - Para cada dia: quantas questões vencem (nextReview ≤ final do dia)
 * - Vencidas hoje (nextReview ≤ agora)
 * - Separadas por matéria para o dia selecionado (?date=YYYY-MM-DD)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const selectedDate = searchParams.get("date"); // YYYY-MM-DD

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Fetch all progress with nextReview set
  const { data: allProgress } = await db
    .from("Progress")
    .select("questionId, nextReview")
    .eq("userId", dbUser.id)
    .not("nextReview", "is", null);

  const progress = allProgress ?? [];

  // Build day → count map for next 14 days
  const dayMap: Record<string, number> = {};
  const overdueCount = progress.filter(p =>
    (p.nextReview as string).slice(0, 10) < todayStr
  ).length;

  // Initialize next 14 days
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 86400000).toISOString().slice(0, 10);
    dayMap[d] = 0;
  }

  // Count reviews per day
  for (const p of progress) {
    const reviewDate = (p.nextReview as string).slice(0, 10);
    if (reviewDate >= todayStr && dayMap[reviewDate] !== undefined) {
      dayMap[reviewDate] = (dayMap[reviewDate] ?? 0) + 1;
    }
  }

  const agenda = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // If selectedDate, return breakdown by subject for that day
  let subjectBreakdown: { subjectId: string; subjectName: string; count: number }[] = [];
  if (selectedDate) {
    const dayEnd = new Date(selectedDate + "T23:59:59.999Z").toISOString();
    const dayStart = new Date(selectedDate + "T00:00:00.000Z").toISOString();

    const dayProgress = progress.filter(p => {
      const nr = p.nextReview as string;
      // overdue items also count for today
      if (selectedDate === todayStr) return nr <= dayEnd;
      return nr >= dayStart && nr <= dayEnd;
    });

    const qIds = dayProgress.map(p => p.questionId as number);
    if (qIds.length > 0) {
      // Batch fetch question subjects
      const allQData: { id: number; subjectId: string | null }[] = [];
      for (let i = 0; i < qIds.length; i += 500) {
        const { data } = await db.from("Question").select("id, subjectId").in("id", qIds.slice(i, i + 500));
        allQData.push(...(data ?? []));
      }
      const subjCount: Record<string, number> = {};
      for (const q of allQData) {
        if (q.subjectId) subjCount[q.subjectId] = (subjCount[q.subjectId] ?? 0) + 1;
      }

      // Fetch subject names
      const subjectIds = Object.keys(subjCount);
      if (subjectIds.length > 0) {
        const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
        subjectBreakdown = subjectIds.map(id => ({
          subjectId: id,
          subjectName: subjects?.find(s => s.id === id)?.name ?? id,
          count: subjCount[id],
        })).sort((a, b) => b.count - a.count);
      }
    }
  }

  const totalNext7 = agenda.slice(0, 7).reduce((s, d) => s + d.count, 0);

  return NextResponse.json({
    agenda,
    overdueCount,
    totalNext7,
    selectedDate,
    subjectBreakdown,
  });
}
