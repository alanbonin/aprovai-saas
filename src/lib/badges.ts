/**
 * Sistema de conquistas (badges) automático.
 *
 * Verificação é feita após cada resposta de questão (fire-and-forget).
 * Badges já concedidos ficam registrados no KV Note com prefixo __BADGES_AWARDED__
 * para evitar duplicação de XP.
 *
 * XP de badge vai direto para StudentProfile sem contar como crédito de IA.
 */

import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

const BADGE_PREFIX = "__BADGES_AWARDED__";

interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  target: number;
  xpReward: number;
  category: "questoes" | "streak" | "simulado" | "flashcard" | "desempenho";
}

const BADGES_DEF: BadgeDef[] = [
  // Questões respondidas
  { id: "primeiro_passo", label: "Primeiro Passo",  icon: "👣", category: "questoes",  target: 1,    xpReward: 10  },
  { id: "centuriao",      label: "Centurião",        icon: "🎯", category: "questoes",  target: 100,  xpReward: 50  },
  { id: "dedicado",       label: "Dedicado",         icon: "💎", category: "questoes",  target: 500,  xpReward: 150 },
  { id: "veterano",       label: "Veterano",         icon: "🦅", category: "questoes",  target: 1000, xpReward: 300 },
  { id: "lendario",       label: "Lendário",         icon: "⚜️", category: "questoes",  target: 5000, xpReward: 1000 },
  // Streak
  { id: "sequencia_3",    label: "Sequência 3",      icon: "🔥", category: "streak",    target: 3,    xpReward: 15  },
  { id: "sequencia_7",    label: "Sequência 7",      icon: "🔥", category: "streak",    target: 7,    xpReward: 40  },
  { id: "invicto",        label: "Invicto",          icon: "🏆", category: "streak",    target: 30,   xpReward: 200 },
  { id: "inabalavel",     label: "Inabalável",       icon: "💪", category: "streak",    target: 100,  xpReward: 600 },
  // Simulados
  { id: "primeiro_sim",   label: "Estreante",        icon: "📝", category: "simulado",  target: 1,    xpReward: 25  },
  { id: "velocista",      label: "Velocista",        icon: "⚡", category: "simulado",  target: 5,    xpReward: 80  },
  { id: "maratonista",    label: "Maratonista",      icon: "🏅", category: "simulado",  target: 20,   xpReward: 250 },
  // Flashcards
  { id: "flashstart",     label: "Flash Start",      icon: "🃏", category: "flashcard", target: 10,   xpReward: 20  },
  { id: "flashmaster",    label: "Flash Master",     icon: "🃏", category: "flashcard", target: 50,   xpReward: 80  },
  { id: "flashlenda",     label: "Flash Lenda",      icon: "✨", category: "flashcard", target: 200,  xpReward: 250 },
  // Desempenho
  { id: "acertador",      label: "Acertador",        icon: "🎖️", category: "desempenho", target: 70,  xpReward: 60  },
  { id: "mestre",         label: "Mestre",           icon: "👑", category: "desempenho", target: 90,  xpReward: 200 },
];

/** Carrega set de badge IDs já concedidos para o usuário */
async function loadAwardedBadges(userId: string): Promise<{ noteId: string | null; ids: Set<string> }> {
  const { data } = await db.from("Note").select("id, content")
    .eq("userId", userId).eq("subjectId", BADGE_PREFIX).single();
  try {
    const ids: string[] = data?.content ? JSON.parse(data.content) as string[] : [];
    return { noteId: data?.id ?? null, ids: new Set(ids) };
  } catch {
    return { noteId: null, ids: new Set() };
  }
}

/** Salva set atualizado de badges concedidos */
async function saveAwardedBadges(userId: string, noteId: string | null, ids: Set<string>) {
  const content = JSON.stringify([...ids]);
  if (noteId) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", noteId);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(), userId, subjectId: BADGE_PREFIX, content,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Verifica se novos badges foram desbloqueados e concede XP para cada um.
 * Chamada fire-and-forget — não bloqueia a resposta da API.
 *
 * @returns lista de badges recém-desbloqueados (para uso futuro)
 */
export async function checkAndAwardBadges(userId: string): Promise<BadgeDef[]> {
  // Busca dados em paralelo
  const [
    { noteId, ids: alreadyAwarded },
    progressRes,
    profileRes,
    simuladoRes,
    flashcardRes,
  ] = await Promise.all([
    loadAwardedBadges(userId),
    db.from("Progress").select("correct").eq("userId", userId),
    db.from("StudentProfile").select("id, xp, streak").eq("userId", userId).single(),
    db.from("SimuladoHistory").select("id").eq("userId", userId),
    db.from("FlashcardSet").select("cards").eq("userId", userId),
  ]);

  const totalAnswered  = (progressRes.data ?? []).length;
  const totalCorrect   = (progressRes.data ?? []).filter(p => p.correct).length;
  const overallAccuracy = totalAnswered >= 20
    ? Math.round((totalCorrect / totalAnswered) * 100)
    : 0;
  const streak         = (profileRes.data?.streak as number) ?? 0;
  const totalSimulados = (simuladoRes.data ?? []).length;

  let flashcardTotal = 0;
  for (const set of flashcardRes.data ?? []) {
    try {
      const cards = JSON.parse(set.cards as string) as unknown[];
      flashcardTotal += cards.length;
    } catch { /* ignore */ }
  }

  function getValue(b: BadgeDef): number {
    switch (b.category) {
      case "questoes":    return totalAnswered;
      case "streak":      return streak;
      case "simulado":    return totalSimulados;
      case "flashcard":   return flashcardTotal;
      case "desempenho":  return overallAccuracy;
    }
  }

  // Encontra badges recém-desbloqueados (que não foram concedidos ainda)
  const newlyUnlocked: BadgeDef[] = [];
  for (const b of BADGES_DEF) {
    if (!alreadyAwarded.has(b.id) && getValue(b) >= b.target) {
      newlyUnlocked.push(b);
    }
  }

  if (newlyUnlocked.length === 0) return [];

  // Concede XP para cada badge novo
  const totalXpBonus = newlyUnlocked.reduce((s, b) => s + b.xpReward, 0);
  const currentXP = (profileRes.data?.xp as number) ?? 0;

  if (profileRes.data?.id && totalXpBonus > 0) {
    await db.from("StudentProfile").update({
      xp: currentXP + totalXpBonus,
    }).eq("id", profileRes.data.id);
  }

  // Marca badges como concedidos
  const updatedIds = new Set([...alreadyAwarded, ...newlyUnlocked.map(b => b.id)]);
  await saveAwardedBadges(userId, noteId, updatedIds);

  // Envia push notification para o primeiro badge desbloqueado (evita spam)
  if (newlyUnlocked.length > 0) {
    const first = newlyUnlocked[0];
    void sendPushToUser(userId, {
      title: `${first.icon} Conquista desbloqueada!`,
      body: `${first.label} — +${first.xpReward} XP`,
      url: "/conquistas",
    }).catch(() => {});
  }

  return newlyUnlocked;
}
