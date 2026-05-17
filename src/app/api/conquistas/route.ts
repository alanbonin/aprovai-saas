import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/conquistas
 * Retorna todas as conquistas (badges) com progresso atual e critério de desbloqueio.
 */

interface Badge {
  id: string;
  label: string;
  desc: string;
  icon: string;
  category: "questoes" | "streak" | "simulado" | "flashcard" | "desempenho" | "especial";
  unlocked: boolean;
  progress: number;   // 0–100 (percentage toward unlock)
  current: number;    // current value
  target: number;     // target value to unlock
  xpReward: number;
}

const BADGES_DEF: Omit<Badge, "unlocked" | "progress" | "current">[] = [
  // Questões
  { id: "primeiro_passo",  label: "Primeiro Passo",  desc: "Responda sua primeira questão",      icon: "👣", category: "questoes",    target: 1,    xpReward: 10 },
  { id: "centuriao",       label: "Centurião",        desc: "Responda 100 questões",              icon: "🎯", category: "questoes",    target: 100,  xpReward: 50 },
  { id: "dedicado",        label: "Dedicado",         desc: "Responda 500 questões",              icon: "💎", category: "questoes",    target: 500,  xpReward: 150 },
  { id: "veterano",        label: "Veterano",         desc: "Responda 1.000 questões",            icon: "🦅", category: "questoes",    target: 1000, xpReward: 300 },
  { id: "lendario",        label: "Lendário",         desc: "Responda 5.000 questões",            icon: "⚜️", category: "questoes",    target: 5000, xpReward: 1000 },
  // Streak
  { id: "sequencia_3",     label: "Sequência 3",      desc: "Estude 3 dias seguidos",             icon: "🔥", category: "streak",      target: 3,    xpReward: 15 },
  { id: "sequencia_7",     label: "Sequência 7",      desc: "Estude 7 dias seguidos",             icon: "🔥", category: "streak",      target: 7,    xpReward: 40 },
  { id: "invicto",         label: "Invicto",          desc: "Estude 30 dias seguidos",            icon: "🏆", category: "streak",      target: 30,   xpReward: 200 },
  { id: "inabalavel",      label: "Inabalável",       desc: "Estude 100 dias seguidos",           icon: "💪", category: "streak",      target: 100,  xpReward: 600 },
  // Simulado
  { id: "primeiro_sim",    label: "Estreante",        desc: "Conclua seu primeiro simulado",      icon: "📝", category: "simulado",    target: 1,    xpReward: 25 },
  { id: "velocista",       label: "Velocista",        desc: "Conclua 5 simulados",                icon: "⚡", category: "simulado",    target: 5,    xpReward: 80 },
  { id: "maratonista",     label: "Maratonista",      desc: "Conclua 20 simulados",               icon: "🏅", category: "simulado",    target: 20,   xpReward: 250 },
  // Flashcard
  { id: "flashstart",      label: "Flash Start",      desc: "Revise 10 flashcards",               icon: "🃏", category: "flashcard",   target: 10,   xpReward: 20 },
  { id: "flashmaster",     label: "Flash Master",     desc: "Revise 50 flashcards",               icon: "🃏", category: "flashcard",   target: 50,   xpReward: 80 },
  { id: "flashlenda",      label: "Flash Lenda",      desc: "Revise 200 flashcards",              icon: "✨", category: "flashcard",   target: 200,  xpReward: 250 },
  // Desempenho
  { id: "acertador",       label: "Acertador",        desc: "Atinja 70% de aproveitamento geral", icon: "🎖️", category: "desempenho",  target: 70,   xpReward: 60 },
  { id: "mestre",          label: "Mestre",           desc: "Atinja 90% de aproveitamento geral", icon: "👑", category: "desempenho",  target: 90,   xpReward: 200 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [
    profileRes,
    progressRes,
    simuladoRes,
    flashcardRes,
  ] = await Promise.all([
    db.from("StudentProfile").select("streak").eq("userId", dbUser.id).single(),
    db.from("Progress").select("correct").eq("userId", dbUser.id),
    db.from("SimuladoHistory").select("id").eq("userId", dbUser.id),
    db.from("FlashcardSet").select("cards").eq("userId", dbUser.id),
  ]);

  const totalAnswered = (progressRes.data ?? []).length;
  const totalCorrect  = (progressRes.data ?? []).filter(p => p.correct).length;
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const streak = (profileRes.data?.streak as number) ?? 0;
  const totalSimulados = (simuladoRes.data ?? []).length;

  // Count total flashcards across all sets
  let flashcardTotal = 0;
  for (const set of flashcardRes.data ?? []) {
    try {
      const cards = JSON.parse(set.cards as string) as unknown[];
      flashcardTotal += cards.length;
    } catch { /* ignore */ }
  }

  function getValue(id: string): number {
    if (id === "primeiro_passo" || id === "centuriao" || id === "dedicado" || id === "veterano" || id === "lendario") {
      return totalAnswered;
    }
    if (id === "sequencia_3" || id === "sequencia_7" || id === "invicto" || id === "inabalavel") {
      return streak;
    }
    if (id === "primeiro_sim" || id === "velocista" || id === "maratonista") {
      return totalSimulados;
    }
    if (id === "flashstart" || id === "flashmaster" || id === "flashlenda") {
      return flashcardTotal;
    }
    if (id === "acertador" || id === "mestre") {
      return totalAnswered >= 20 ? overallAccuracy : 0;
    }
    return 0;
  }

  const badges: Badge[] = BADGES_DEF.map(b => {
    const current = getValue(b.id);
    const unlocked = current >= b.target;
    const progress = Math.min(100, Math.round((current / b.target) * 100));
    return { ...b, current, unlocked, progress };
  });

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalXpEarned = badges.filter(b => b.unlocked).reduce((s, b) => s + b.xpReward, 0);

  return NextResponse.json({ badges, unlockedCount, total: badges.length, totalXpEarned });
}
