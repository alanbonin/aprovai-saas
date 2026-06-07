import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { updateXP, XP_FLASHCARD_LEMBREI } from "@/lib/xp";

// ── Algoritmo SM-2 adaptado ───────────────────────────────────────────────────
function calcNextReview(existing: { interval?: number; easeFactor?: number } | null, quality: string) {
  const ease = existing?.easeFactor ?? 2.5;
  const interval = existing?.interval ?? 1;
  let newInterval: number;
  let newEase: number;

  switch (quality) {
    case "lembrei":
      newInterval = Math.round(interval * ease);
      newEase = Math.min(3.0, ease + 0.1);
      break;
    case "dificil":
      newInterval = Math.max(1, Math.round(interval * 1.2));
      newEase = Math.max(1.3, ease - 0.15);
      break;
    case "nao-lembrei":
    default:
      newInterval = 1;
      newEase = Math.max(1.3, ease - 0.2);
      break;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  return { interval: newInterval, easeFactor: newEase, nextReview: nextReview.toISOString() };
}

// ── POST — atualiza progresso de um flashcard específico ─────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as { setId: string; cardId: string; quality: string };
    const { setId, cardId, quality } = body;

    // Carrega o FlashcardSet (qualquer proprietário — pode ser admin)
    const { data: set } = await db
      .from("FlashcardSet")
      .select("id, cards, userId")
      .eq("id", setId)
      .single();

    if (!set) return NextResponse.json({ error: "Deck não encontrado" }, { status: 404 });

    const isOwn = set.userId === dbUser.id;
    const NOTE_PREFIX = "__FC_PROG__";
    const noteKey = `${NOTE_PREFIX}${setId}`;

    let srsResult: { interval: number; nextReview: string };

    if (isOwn) {
      // Deck do aluno: SM-2 diretamente no JSON do deck
      const cards = (set.cards as { id: string; front: string; back: string; interval?: number; easeFactor?: number; nextReview?: string }[]) ?? [];
      const updatedCards = cards.map(c => {
        if (c.id !== cardId) return c;
        const srsData = calcNextReview({ interval: c.interval, easeFactor: c.easeFactor }, quality);
        return { ...c, ...srsData };
      });
      await db.from("FlashcardSet").update({ cards: updatedCards, updatedAt: new Date().toISOString() }).eq("id", setId);
      const updatedCard = updatedCards.find(c => c.id === cardId);
      srsResult = { interval: updatedCard?.interval ?? 1, nextReview: updatedCard?.nextReview ?? "" };
    } else {
      // Deck do admin: progresso pessoal em Note
      const { data: progNote } = await db.from("Note").select("id, content")
        .eq("userId", dbUser.id).eq("subjectId", noteKey).single();

      type ProgMap = Record<string, { interval: number; easeFactor: number; nextReview: string }>;
      let progressMap: ProgMap = {};
      try { if (progNote?.content) progressMap = JSON.parse(progNote.content) as ProgMap; } catch { /* ignore */ }

      const existing = progressMap[cardId] ?? null;
      const srsData = calcNextReview(existing, quality);
      progressMap[cardId] = srsData;

      const content = JSON.stringify(progressMap);
      const now = new Date().toISOString();
      if (progNote?.id) {
        await db.from("Note").update({ content, updatedAt: now }).eq("id", progNote.id);
      } else {
        await db.from("Note").insert({
          id: crypto.randomUUID(),
          userId: dbUser.id,
          subjectId: noteKey,
          content,
          createdAt: now,
          updatedAt: now,
        });
      }
      srsResult = { interval: srsData.interval, nextReview: srsData.nextReview };
    }

    // Incrementa uso semanal de flashcards
    const { getAccessLevel } = await import("@/lib/access");
    const { incrementWeeklyResourceUsage } = await import("@/lib/api-utils");
    const access = await getAccessLevel().catch(() => null);
    const limit = access?.maxFlashcardsPerWeek ?? -1;
    if (limit > 0 && limit < 9999) {
      void incrementWeeklyResourceUsage(dbUser.id, "flashcards").catch(() => {});
    }

    // XP apenas quando lembrou
    const xpDelta = quality === "lembrei" ? XP_FLASHCARD_LEMBREI : 0;
    void updateXP(dbUser.id, xpDelta).catch(() => {});

    return NextResponse.json({ nextReview: srsResult.nextReview, interval: srsResult.interval });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
