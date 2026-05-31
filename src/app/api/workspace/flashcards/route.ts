import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

// GET — lista todos os decks com stats de revisão, filtrados pelas matérias do aluno
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Matérias do perfil ativo
  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  let ssQuery = db.from("StudentSubject").select("subjectId").eq("userId", dbUser.id);
  if (profileId) ssQuery = ssQuery.eq("profileId", profileId);
  const { data: studentSubjects } = await ssQuery;

  let subjectIds = (studentSubjects ?? []).map(s => s.subjectId as string);
  // Fallback para legados se o perfil não tiver matérias
  if (subjectIds.length === 0 && profileId) {
    const { data: legacy } = await db.from("StudentSubject").select("subjectId").eq("userId", dbUser.id).is("profileId", null);
    subjectIds = (legacy ?? []).map(s => s.subjectId as string);
  }

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

  // Build subjectName lookup
  const uniqueSubjectIds = [...new Set((sets ?? []).map(s => s.subjectId as string).filter(Boolean))];
  const subjectMap: Record<string, string> = {};
  if (uniqueSubjectIds.length > 0) {
    const { data: subjectsData } = await db
      .from("Subject")
      .select("id, name")
      .in("id", uniqueSubjectIds);
    for (const sub of subjectsData ?? []) {
      subjectMap[sub.id as string] = sub.name as string;
    }
  }

  const nowMs = Date.now();

  type Card = { id: string; nextReview?: string; interval?: number };

  // Para decks do admin, busca progresso pessoal do aluno nas Notes
  const NOTE_PREFIX = "__FC_PROG__";
  const adminSetIds = (sets ?? [])
    .filter(s => s.userId !== dbUser.id)
    .map(s => s.id as string);

  // Carrega todas as Notes de progresso de uma vez
  const progressBySet: Record<string, Record<string, { nextReview: string }>> = {};
  if (adminSetIds.length > 0) {
    const noteKeys = adminSetIds.map(id => `${NOTE_PREFIX}${id}`);
    const { data: progNotes } = await db
      .from("Note")
      .select("subjectId, content")
      .eq("userId", dbUser.id)
      .in("subjectId", noteKeys);

    for (const note of progNotes ?? []) {
      const setId = (note.subjectId as string).replace(NOTE_PREFIX, "");
      try {
        progressBySet[setId] = JSON.parse(note.content as string) as Record<string, { nextReview: string }>;
      } catch { /* ignore */ }
    }
  }

  const decks = (sets ?? []).map(s => {
    const cards = (s.cards as Card[]) ?? [];
    const isOwn = s.userId === dbUser.id;
    let dueCount: number;

    if (isOwn) {
      // Deck do aluno: nextReview está direto no card
      dueCount = cards.filter(c => !c.nextReview || new Date(c.nextReview).getTime() <= nowMs).length;
    } else {
      // Deck do admin: nextReview está na Note pessoal
      const prog = progressBySet[s.id as string] ?? {};
      dueCount = cards.filter(c => {
        const p = prog[c.id];
        return !p?.nextReview || new Date(p.nextReview).getTime() <= nowMs;
      }).length;
    }

    return {
      id: s.id,
      name: s.name,
      subjectId: s.subjectId,
      subjectName: subjectMap[s.subjectId as string] ?? "",
      totalCards: cards.length,
      dueCount,
      updatedAt: s.updatedAt,
    };
  }).sort((a, b) => b.dueCount - a.dueCount);

  const totalDueToday = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return NextResponse.json({ decks, totalDueToday });
}
