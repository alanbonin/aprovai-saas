import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export interface TimelineEvent {
  id: string;
  type: "questao_milestone" | "simulado" | "conquista" | "xp_milestone" | "streak_milestone" | "inicio" | "diario";
  date: string;           // ISO
  title: string;
  description: string;
  icon: string;
  color: string;          // tailwind color token
  value?: number;         // e.g. XP earned, score %, streak days
}

/** GET /api/workspace/timeline?limit=50 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));

  const events: TimelineEvent[] = [];

  // ── 1. Início da jornada ────────────────────────────────────────────────────
  const { data: userRow } = await db.from("User").select("createdAt, name").eq("id", dbUser.id).single();
  if (userRow) {
    events.push({
      id: "inicio",
      type: "inicio",
      date: userRow.createdAt as string,
      title: "Jornada começou! 🚀",
      description: `Bem-vindo(a) à Aprovai, ${(userRow.name as string)?.split(" ")[0] ?? ""}! Sua preparação começa aqui.`,
      icon: "🚀",
      color: "indigo",
    });
  }

  // ── 2. Marcos de questões respondidas ───────────────────────────────────────
  const { data: progressAll } = await db
    .from("Progress")
    .select("createdAt, correct")
    .eq("userId", dbUser.id)
    .order("createdAt", { ascending: true });

  const allProg = progressAll ?? [];
  const QUESTAO_MILESTONES = [1, 10, 50, 100, 250, 500, 1000, 2500, 5000];
  QUESTAO_MILESTONES.forEach(n => {
    if (allProg.length >= n) {
      const event = allProg[n - 1];
      events.push({
        id: `q_${n}`,
        type: "questao_milestone",
        date: event.createdAt as string,
        title: `${n} questões respondidas!`,
        description: n === 1 ? "Primeira questão respondida — o início de tudo!" : `Marco de ${n.toLocaleString("pt-BR")} questões alcançado!`,
        icon: n >= 1000 ? "🏆" : n >= 500 ? "🌟" : n >= 100 ? "⭐" : "📝",
        color: n >= 1000 ? "yellow" : n >= 500 ? "indigo" : "blue",
        value: n,
      });
    }
  });

  // ── 3. Simulados completados ─────────────────────────────────────────────────
  const { data: simulados } = await db
    .from("SimuladoHistory")
    .select("id, total, correct, timeSecs, createdAt")
    .eq("userId", dbUser.id)
    .order("createdAt", { ascending: true });

  for (const sim of simulados ?? []) {
    const pct = (sim.total as number) > 0 ? Math.round(((sim.correct as number) / (sim.total as number)) * 100) : 0;
    events.push({
      id: `sim_${sim.id}`,
      type: "simulado",
      date: sim.createdAt as string,
      title: `Simulado: ${pct}% de acerto`,
      description: `${sim.correct}/${sim.total} questões corretas em ${Math.floor((sim.timeSecs as number) / 60)} minutos.`,
      icon: pct >= 80 ? "🎯" : pct >= 60 ? "📊" : "📋",
      color: pct >= 80 ? "emerald" : pct >= 60 ? "blue" : "amber",
      value: pct,
    });
  }

  // ── 4. Marcos de streak ─────────────────────────────────────────────────────
  const { data: profile } = await db
    .from("StudentProfile")
    .select("streak, xp, createdAt")
    .eq("userId", dbUser.id)
    .single();

  const currentStreak = profile?.streak ?? 0;
  const STREAK_MILESTONES = [7, 14, 30, 60, 100];
  for (const s of STREAK_MILESTONES) {
    if (currentStreak >= s) {
      events.push({
        id: `streak_${s}`,
        type: "streak_milestone",
        date: new Date(Date.now() - (currentStreak - s) * 86400000).toISOString(),
        title: `${s} dias de sequência! 🔥`,
        description: `${s} dias consecutivos de estudos — consistência é a chave do sucesso!`,
        icon: "🔥",
        color: "orange",
        value: s,
      });
    }
  }

  // ── 5. Marcos de XP ─────────────────────────────────────────────────────────
  const currentXp = profile?.xp ?? 0;
  const XP_MILESTONES = [100, 500, 1000, 2500, 5000, 10000];
  // Estimate date: assume XP earned proportionally over progress entries
  for (const xp of XP_MILESTONES) {
    if (currentXp >= xp) {
      const pct = xp / Math.max(currentXp, 1);
      const idx = Math.floor(pct * allProg.length);
      const dateRow = allProg[Math.min(idx, allProg.length - 1)];
      if (dateRow) {
        events.push({
          id: `xp_${xp}`,
          type: "xp_milestone",
          date: dateRow.createdAt as string,
          title: `${xp.toLocaleString("pt-BR")} XP acumulados!`,
          description: `Cada questão respondida te aproxima da aprovação. Continue! 💪`,
          icon: "⚡",
          color: "yellow",
          value: xp,
        });
      }
    }
  }

  // ── 6. Diário entries (last 10) ─────────────────────────────────────────────
  const { data: diarioNote } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", "__DIARIO__")
    .single();

  if (diarioNote?.content) {
    try {
      const entries = JSON.parse(diarioNote.content as string) as {
        date: string; hours: number; mood: number; notes: string;
      }[];
      for (const e of entries.slice(0, 10)) {
        const moodEmoji = ["", "😞", "😕", "😐", "🙂", "😄"][e.mood] ?? "😐";
        events.push({
          id: `diario_${e.date}`,
          type: "diario",
          date: e.date + "T12:00:00Z",
          title: `Sessão de ${e.hours}h registrada ${moodEmoji}`,
          description: e.notes || `${e.hours} horas de estudos registradas no diário.`,
          icon: "📔",
          color: "purple",
          value: e.hours,
        });
      }
    } catch { /* ignore */ }
  }

  // ── Sort & limit ─────────────────────────────────────────────────────────────
  const sorted = events
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  return NextResponse.json({
    events: sorted,
    stats: {
      totalQuestoes: allProg.length,
      totalSimulados: (simulados ?? []).length,
      currentStreak,
      xp: currentXp,
    },
  });
}
