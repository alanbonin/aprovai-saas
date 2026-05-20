import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// GET — lista todos os decks com stats de revisão, filtrados pelas matérias do aluno
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Matérias que o aluno selecionou
  const { data: studentSubjects } = await db
    .from("StudentSubject")
    .select("subjectId")
    .eq("userId", dbUser.id);

  const subjectIds = (studentSubjects ?? []).map(s => s.subjectId);

  // IDs dos admins (para incluir todos os decks criados por admins)
  const { data: adminUsers } = await db
    .from("User")
    .select("id")
    .eq("role", "ADMIN");
  const adminIds = (adminUsers ?? []).map(u => u.id as string);

  // Busca:
  // 1. Decks criados pelo próprio aluno
  // 2. Decks de admins (biblioteca da plataforma)
  // 3. Decks de qualquer usuário nas matérias do aluno
  let query = db
    .from("FlashcardSet")
    .select("id, name, subjectId, cards, updatedAt, userId");

  // Monta filtro OR: userId do aluno | userId de admin | subjectId nas matérias do aluno
  const orParts: string[] = [`userId.eq.${dbUser.id as string}`];
  if (adminIds.length > 0) orParts.push(`userId.in.(${adminIds.join(",")})`);
  if (subjectIds.length > 0) orParts.push(`subjectId.in.(${subjectIds.join(",")})`);

  const { data: sets } = await query
    .or(orParts.join(","))
    .order("updatedAt", { ascending: false });

  const nowMs = Date.now();

  type Card = {
    id: string;
    nextReview?: string;
    interval?: number;
  };

  const decks = (sets ?? []).map(s => {
    const cards = (s.cards as Card[]) ?? [];
    const dueCount = cards.filter(c => !c.nextReview || new Date(c.nextReview).getTime() <= nowMs).length;
    return {
      id: s.id,
      name: s.name,
      subjectId: s.subjectId,
      totalCards: cards.length,
      dueCount,
      updatedAt: s.updatedAt,
    };
  }).sort((a, b) => b.dueCount - a.dueCount);

  const totalDueToday = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return NextResponse.json({ decks, totalDueToday });
}
