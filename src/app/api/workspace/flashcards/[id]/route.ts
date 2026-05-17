import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/workspace/flashcards/[id]
 * Retorna as cartas de um deck específico.
 * Funciona para decks do próprio aluno e decks do admin
 * (nesse caso, o SM-2 pessoal do aluno fica em Note com prefixo __FC_PROG__<setId>__).
 */

const NOTE_PREFIX = "__FC_PROG__";

interface CardRaw {
  id: string;
  front: string;
  back: string;
  interval?: number;
  easeFactor?: number;
  nextReview?: string;
}

interface CardOut extends CardRaw {
  dueNow: boolean;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Busca o deck (pode ser do aluno ou do admin)
  const { data: set } = await db
    .from("FlashcardSet")
    .select("id, name, subjectId, cards, userId")
    .eq("id", id)
    .single();

  if (!set) return NextResponse.json({ error: "Deck não encontrado" }, { status: 404 });

  const rawCards = (set.cards as CardRaw[]) ?? [];
  const isOwn = set.userId === dbUser.id;

  let cards: CardOut[];

  if (isOwn) {
    // Deck do próprio aluno: SM-2 já está no JSON do deck
    const nowMs = Date.now();
    cards = rawCards.map(c => ({
      ...c,
      dueNow: !c.nextReview || new Date(c.nextReview).getTime() <= nowMs,
    }));
  } else {
    // Deck do admin: carrega progresso pessoal do Note
    const noteKey = `${NOTE_PREFIX}${id}`;
    const { data: progressNote } = await db
      .from("Note")
      .select("content")
      .eq("userId", dbUser.id)
      .eq("subjectId", noteKey)
      .single();

    const progressMap: Record<string, { interval: number; easeFactor: number; nextReview: string }> = {};
    try {
      if (progressNote?.content) {
        const parsed = JSON.parse(progressNote.content) as typeof progressMap;
        Object.assign(progressMap, parsed);
      }
    } catch { /* ignore */ }

    const nowMs = Date.now();
    cards = rawCards.map(c => {
      const prog = progressMap[c.id];
      return {
        ...c,
        interval: prog?.interval ?? c.interval,
        easeFactor: prog?.easeFactor ?? c.easeFactor,
        nextReview: prog?.nextReview ?? c.nextReview,
        dueNow: !prog?.nextReview ? true : new Date(prog.nextReview).getTime() <= nowMs,
      };
    });
  }

  const dueCount = cards.filter(c => c.dueNow).length;

  return NextResponse.json({
    id: set.id,
    name: set.name,
    subjectId: set.subjectId,
    isOwn,
    cards,
    dueCount,
    totalCards: cards.length,
  });
}
