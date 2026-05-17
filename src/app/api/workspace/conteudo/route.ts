import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ materiais: [], questoes: [], flashcards: [] });

  const [
    { data: materiais },
    { data: questoes },
    { data: progressList },
    { data: flashcardSets },
  ] = await Promise.all([
    db.from("Material")
      .select("id, title, type, description, fileUrl, isPremium")
      .eq("subjectId", subjectId)
      .eq("active", true)
      .order("createdAt"),
    db.from("Question")
      .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year, level, artigo, dicaBanca")
      .eq("subjectId", subjectId)
      .limit(80),
    db.from("Progress")
      .select("questionId, nextReview, interval, correct")
      .eq("userId", dbUser.id),
    db.from("FlashcardSet")
      .select("id, name, cards")
      .eq("subjectId", subjectId)
      .order("createdAt"),
  ]);

  // Enriquece questões com progresso e ordena: vencidas/novas primeiro, futuras por último
  const progressMap = new Map((progressList ?? []).map((p: { questionId: number; nextReview: string | null; interval: number; correct: boolean }) => [p.questionId, p]));
  const now = Date.now();

  const questoesEnriquecidas = (questoes ?? []).map((q: { id: number; [key: string]: unknown }) => {
    const prog = progressMap.get(q.id);
    return {
      ...q,
      _nextReview: prog?.nextReview ?? null,
      _interval: prog?.interval ?? null,
      _seen: !!prog,
    };
  }).sort((a: { _seen: boolean; _nextReview: string | null }, b: { _seen: boolean; _nextReview: string | null }) => {
    const aOverdue = !a._seen || !a._nextReview || new Date(a._nextReview).getTime() <= now;
    const bOverdue = !b._seen || !b._nextReview || new Date(b._nextReview).getTime() <= now;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return 0;
  });

  // Flashcards: flatten + inclui setId e dados SRS (nextReview, interval, easeFactor)
  const nowMs = Date.now();
  const flashcards: {
    id: string; front: string; back: string; deckName: string; setId: string;
    nextReview: string | null; interval: number; easeFactor: number; due: boolean;
  }[] = [];
  for (const set of flashcardSets ?? []) {
    const cards = (set.cards as { id: string; front: string; back: string; nextReview?: string; interval?: number; easeFactor?: number }[]) ?? [];
    cards.forEach(c => {
      const due = !c.nextReview || new Date(c.nextReview).getTime() <= nowMs;
      flashcards.push({ ...c, deckName: set.name, setId: set.id, nextReview: c.nextReview ?? null, interval: c.interval ?? 1, easeFactor: c.easeFactor ?? 2.5, due });
    });
  }
  flashcards.sort((a, b) => (a.due && !b.due ? -1 : !a.due && b.due ? 1 : 0));

  return NextResponse.json({
    materiais: materiais ?? [],
    questoes: questoesEnriquecidas,
    flashcards,
  });
}
