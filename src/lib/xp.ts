import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

/**
 * XP por ação:
 * - Questão correta: +2 XP
 * - Questão errada: +0 XP (sem punição)
 * - Flashcard revisado ("lembrei"): +1 XP
 * - Flashcard difícil: +0 XP
 * - Simulado concluído (por questão correta): +3 XP
 * - Bônus de streak (múltiplos de 7d): +20 XP
 */
export const XP_CORRECT_QUESTION   = 2;
export const XP_FLASHCARD_LEMBREI  = 1;
export const XP_SIMULADO_PER_ACERTO = 3;
export const XP_STREAK_BONUS        = 20; // a cada 7 dias de streak

export interface XPResult {
  xpGained: number;
  newXP: number;
  streakBefore: number;
  streakAfter: number;
  streakBonus: boolean;
}

/**
 * Atualiza XP e streak do aluno no StudentProfile.
 * Cria o registro se não existir.
 *
 * @param userId  - ID do User no banco
 * @param xpDelta - XP a adicionar (pode ser 0)
 */
/** Retorna YYYY-MM-DD no horário de Brasília (America/Sao_Paulo) */
function todayBRT(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Retorna YYYY-MM-DD do dia anterior no horário de Brasília */
function yesterdayBRT(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(d);
}

export async function updateXP(userId: string, xpDelta: number): Promise<XPResult> {
  const today = todayBRT(); // YYYY-MM-DD em BRT (sem bug de UTC)

  // Busca perfil atual
  const { data: profile } = await db
    .from("StudentProfile")
    .select("id, xp, streak, lastStudyDate")
    .eq("userId", userId)
    .single();

  const currentXP     = profile?.xp ?? 0;
  const currentStreak = profile?.streak ?? 0;
  const lastStudy     = profile?.lastStudyDate as string | null | undefined;

  // Calcula novo streak
  let newStreak = currentStreak;
  const yesterdayStr = yesterdayBRT();

  if (lastStudy === today) {
    // Já estudou hoje — streak não muda
    newStreak = currentStreak;
  } else if (lastStudy === yesterdayStr) {
    // Estudou ontem — incrementa streak
    newStreak = currentStreak + 1;
  } else if (!lastStudy) {
    // Primeira vez
    newStreak = 1;
  } else {
    // Pulou um ou mais dias — reseta
    newStreak = 1;
  }

  // Bônus de streak a cada 7 dias
  const streakBonus = newStreak > 0 && newStreak % 7 === 0 && lastStudy !== today;
  const totalXPDelta = xpDelta + (streakBonus ? XP_STREAK_BONUS : 0);
  const newXP = currentXP + totalXPDelta;

  if (profile?.id) {
    await db.from("StudentProfile").update({
      xp: newXP,
      streak: newStreak,
      lastStudyDate: today,
    }).eq("id", profile.id);
  } else {
    // Cria perfil se não existir
    await db.from("StudentProfile").insert({
      id: crypto.randomUUID(),
      userId,
      xp: newXP,
      streak: newStreak,
      lastStudyDate: today,
      onboardingDone: false,
      createdAt: new Date().toISOString(),
    });
  }

  // Push notification para milestones de streak
  const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
  if (
    newStreak !== currentStreak &&
    STREAK_MILESTONES.includes(newStreak) &&
    lastStudy !== today
  ) {
    void sendPushToUser(userId, {
      title: `🔥 ${newStreak} dias de sequência!`,
      body: `Incrível! Continue estudando para manter seu ritmo. +${XP_STREAK_BONUS} XP bônus!`,
      url: "/hoje",
    }).catch(() => {});
  }

  return {
    xpGained: totalXPDelta,
    newXP,
    streakBefore: currentStreak,
    streakAfter: newStreak,
    streakBonus,
  };
}
