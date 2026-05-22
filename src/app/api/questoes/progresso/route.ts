import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { updateXP, XP_CORRECT_QUESTION } from "@/lib/xp";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { checkAndAwardBadges } from "@/lib/badges";

const AUTO_FC_PREFIX = "__AUTO_ERRO_FC__";
const AUTO_FC_SYSTEM = `Especialista em flashcards para concursos públicos brasileiros.
Dado uma questão errada, crie 1 flashcard objetivo. Responda APENAS com JSON.`;

async function autoFlashcardOnError(userId: string, questionId: number) {
  // Verifica se já existe flashcard desta questão
  const { data: note } = await db.from("Note").select("id, content")
    .eq("userId", userId).eq("subjectId", AUTO_FC_PREFIX).maybeSingle();

  interface StoredCard { id: string; front: string; back: string; questionId: number; createdAt: string }
  let cards: StoredCard[] = [];
  try { cards = JSON.parse(note?.content ?? "[]") as StoredCard[]; } catch { /* ok */ }

  if (cards.some(c => c.questionId === questionId)) return; // já existe

  // Busca dados da questão
  const { data: q } = await db.from("Question")
    .select("statement, answer, optionA, optionB, optionC, optionD, optionE, explanation, Subject(name)")
    .eq("id", questionId).maybeSingle();
  if (!q) return;

  const subjectName = (Array.isArray(q.Subject) ? q.Subject[0] : q.Subject as { name?: string } | null)?.name ?? "Concursos";
  const correctOpt = (q as unknown as Record<string, string>)[`option${q.answer as string}`] ?? "";

  let front: string;
  let back: string;

  try {
    const res = await createWithCache({
      model: MODELS.haiku, maxTokens: 250, cacheSystem: false,
      systemPrompt: AUTO_FC_SYSTEM,
      messages: [{
        role: "user",
        content: `Questão: ${q.statement}\nResposta correta: ${q.answer}) ${correctOpt}\nExplicação: ${q.explanation ?? "N/A"}\nMatéria: ${subjectName}\n\nFormato: {"frente":"pergunta","verso":"resposta objetiva"}`,
      }],
    });
    const text = res.content.find(b => b.type === "text")?.text ?? "{}";
    const parsed = extractJSON<{ frente: string; verso: string }>(text);
    front = parsed.frente;
    back = parsed.verso;
    if (!front || !back) throw new Error("inválido");
  } catch {
    front = `O que é correto sobre: ${String(q.statement).slice(0, 100)}...`;
    back = `${q.answer}) ${correctOpt}${q.explanation ? `\n${String(q.explanation).slice(0, 180)}` : ""}`;
  }

  cards.push({ id: crypto.randomUUID(), front, back, questionId, createdAt: new Date().toISOString() });
  const content = JSON.stringify(cards);

  if (note?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", note.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(), userId, subjectId: AUTO_FC_PREFIX, content,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }
}

// quality: "easy" | "ok" | "hard" | "again"
function calcNextReview(existing: { interval: number; easeFactor: number } | null, quality: string) {
  const ease = existing?.easeFactor ?? 2.5;
  const interval = existing?.interval ?? 1;
  let newInterval: number;
  let newEase: number;
  const correct = quality !== "again";

  switch (quality) {
    case "easy":
      newInterval = Math.round(interval * ease * 1.3);
      newEase = Math.min(3.0, ease + 0.15);
      break;
    case "ok":
      newInterval = Math.round(interval * ease);
      newEase = ease;
      break;
    case "hard":
      newInterval = Math.max(1, Math.round(interval * 1.2));
      newEase = Math.max(1.3, ease - 0.15);
      break;
    default: // "again"
      newInterval = 1;
      newEase = Math.max(1.3, ease - 0.2);
      break;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  return { interval: newInterval, easeFactor: newEase, nextReview: nextReview.toISOString(), correct };
}

const TRIAL_DAILY_LIMIT = 20;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).maybeSingle();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Resolve perfil ativo (multi-perfil)
  const { getActiveProfile } = await import("@/lib/get-active-profile");
  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  // ── Limite trial: 20 questões/dia ────────────────────────────────────────
  const { data: subRow } = await db
    .from("Subscription")
    .select("status, endDate, Plan(price)")
    .eq("userId", dbUser.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const planPrice = (() => {
    const p = (subRow as { Plan?: { price?: number } | { price?: number }[] | null } | null)?.Plan;
    if (!p) return 0;
    return Array.isArray(p) ? (p[0]?.price ?? 0) : (p.price ?? 0);
  })();
  const isTrial = !subRow || planPrice === 0 || (subRow.endDate && new Date(subRow.endDate) < new Date());

  if (isTrial) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await db
      .from("Progress")
      .select("id", { count: "exact", head: true })
      .eq("userId", dbUser.id)
      .gte("reviewedAt", todayStart.toISOString());
    const todayCount = count ?? 0;
    if (todayCount >= TRIAL_DAILY_LIMIT) {
      return NextResponse.json({ limitReached: true, todayCount, limit: TRIAL_DAILY_LIMIT }, { status: 200 });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { questionId, correct, quality } = await req.json();
  // Normaliza strings do componente QuestoesAdaptativas ("lembrei"/"nao-lembrei")
  // para os valores esperados pelo SM-2 ("ok"/"again")
  const rawQ = quality ?? (correct ? "ok" : "again");
  const q = rawQ === "lembrei" ? "ok" : rawQ === "nao-lembrei" ? "again" : rawQ;

  // Busca progresso existente para este perfil (ou legado sem profileId)
  const existingQuery = db
    .from("Progress")
    .select("id, interval, easeFactor")
    .eq("userId", dbUser.id)
    .eq("questionId", questionId);

  const { data: existing } = profileId
    ? await existingQuery.or(`profileId.eq.${profileId},profileId.is.null`).maybeSingle()
    : await existingQuery.is("profileId", null).maybeSingle();

  const { interval, easeFactor, nextReview, correct: isCorrect } = calcNextReview(existing, q);

  if (existing) {
    await db.from("Progress").update({
      correct: isCorrect, interval, easeFactor,
      nextReview, profileId,
      reviewedAt: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await db.from("Progress").insert({
      userId: dbUser.id, profileId, questionId, correct: isCorrect,
      interval, easeFactor, nextReview,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  // Atualiza XP e streak (fire-and-forget)
  const xpDelta = isCorrect ? XP_CORRECT_QUESTION : 0;
  void updateXP(dbUser.id, xpDelta).catch(() => {});

  // Auto-flashcard quando erra (fire-and-forget, não bloqueia resposta)
  if (!isCorrect) {
    void autoFlashcardOnError(dbUser.id, questionId).catch(() => {});
  }

  // Verifica e concede badges desbloqueados (fire-and-forget)
  void checkAndAwardBadges(dbUser.id).catch(() => {});

  return NextResponse.json({ ok: true, nextReview, interval, autoFlashcard: !isCorrect });
}
