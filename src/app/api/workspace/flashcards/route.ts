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

  // Busca em 2 queries separadas para evitar transferir a coluna "cards" (JSON pesado) dos decks de admin:
  // 1. Decks do próprio aluno — inclui "cards" para calcular dueCount e totalCards
  // 2. Decks de admins/matérias — SEM "cards" (apenas metadados), limitado a 100

  const ownQuery = db
    .from("FlashcardSet")
    .select("id, name, subjectId, cards, updatedAt, userId")
    .eq("userId", dbUser.id as string)
    .order("updatedAt", { ascending: false });

  const adminOrParts: string[] = [];
  if (adminIds.length > 0) adminOrParts.push(`userId.in.(${adminIds.join(",")})`);
  if (subjectIds.length > 0) adminOrParts.push(`subjectId.in.(${subjectIds.join(",")})`);

  const adminQueryBase = db
    .from("FlashcardSet")
    .select("id, name, subjectId, updatedAt, userId") // sem "cards" — evita payload enorme
    .neq("userId", dbUser.id as string)
    .order("updatedAt", { ascending: false })
    .range(0, 99); // máximo 100 decks de biblioteca

  const [ownResult, adminResult] = await Promise.all([
    ownQuery,
    adminOrParts.length > 0
      ? adminQueryBase.or(adminOrParts.join(","))
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; subjectId: string; updatedAt: string; userId: string }> }),
  ]);

  // Combina: decks do aluno (com cards) + decks de admin/matérias (sem cards)
  type SetWithCards = { id: string; name: string; subjectId: string; updatedAt: string; userId: string; cards: unknown };
  const ownSets: SetWithCards[] = (ownResult.data ?? []).map(s => ({ ...s } as SetWithCards));
  const adminSets: SetWithCards[] = (adminResult.data ?? []).map(s => ({ ...s, cards: null } as SetWithCards));
  const sets = [...ownSets, ...adminSets];

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
    const cards = (s.cards as Card[] | null) ?? [];
    const isOwn = s.userId === dbUser.id;
    let dueCount: number;

    if (isOwn) {
      // Deck do aluno: nextReview está direto no card (cards completo disponível)
      dueCount = cards.filter(c => !c.nextReview || new Date(c.nextReview).getTime() <= nowMs).length;
    } else {
      // Deck do admin: cards não foi buscado — usa progresso da Note + total conhecido
      const prog = progressBySet[s.id as string] ?? {};
      const progKeys = Object.keys(prog);
      if (progKeys.length === 0) {
        // Sem progresso pessoal → assume todos os cards pendentes (usamos contagem da Note se disponível)
        dueCount = 0; // aparece como "0 para revisar" até o aluno abrir o deck
      } else {
        dueCount = progKeys.filter(cardId => {
          const p = prog[cardId];
          return !p?.nextReview || new Date(p.nextReview).getTime() <= nowMs;
        }).length;
      }
    }

    // Para decks de admin, cards não foi buscado (otimização de payload).
    // totalCards usa os dados de progresso pessoal como estimativa, ou -1 para indicar "desconhecido".
    const adminProg = !isOwn ? (progressBySet[s.id as string] ?? {}) : {};
    const progCount = Object.keys(adminProg).length;
    const totalCards = isOwn ? cards.length : (progCount > 0 ? progCount : 0);

    return {
      id: s.id,
      name: s.name,
      subjectId: s.subjectId,
      subjectName: subjectMap[s.subjectId as string] ?? "",
      totalCards,
      dueCount,
      updatedAt: s.updatedAt,
    };
  }).sort((a, b) => b.dueCount - a.dueCount);

  const totalDueToday = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return NextResponse.json({ decks, totalDueToday });
}
