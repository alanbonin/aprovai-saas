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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).maybeSingle();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Verifica se é plano Trial (para aplicar limite diário)
  const { data: subData } = await db.from("Subscription").select("status, plan:planId(slug)").eq("userId", dbUser.id).not("status", "in", '("CANCELLED","EXPIRED")').order("createdAt", { ascending: false }).limit(1).maybeSingle();
  const isTrial = !subData || (subData as { status?: string } | null)?.status === "TRIAL";

  // Resolve perfil ativo (multi-perfil)
  const { getActiveProfile } = await import("@/lib/get-active-profile");
  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  // ── Limite semanal de questões (compartilhado entre /workspace e /questoes) ─
  const { getAccessLevel } = await import("@/lib/access");
  const { getWeeklyResourceUsage, incrementWeeklyResourceUsage } = await import("@/lib/api-utils");
  const access = await getAccessLevel();
  const weeklyLimit = access.maxQuestionsPerWeek; // -1 = ilimitado, 0 = bloqueado

  if (weeklyLimit === 0) {
    return NextResponse.json({ error: "Questões não disponíveis no seu plano." }, { status: 403 });
  }
  if (weeklyLimit > 0 && weeklyLimit < 9999) {
    const usedThisWeek = await getWeeklyResourceUsage(dbUser.id, "questoes");
    if (usedThisWeek >= weeklyLimit) {
      return NextResponse.json({ limitReached: true, usedThisWeek, limit: weeklyLimit }, { status: 200 });
    }

    // ── Limite DIÁRIO apenas para Trial (30/dia) ─────────────────────────
    if (isTrial) {
      const DAILY_LIMIT = 30;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      // BUG FIX 3: registros antigos podem ter reviewedAt=null — usa createdAt como fallback
      // filtra por OR(reviewedAt >= hoje, createdAt >= hoje AND reviewedAt IS NULL)
      const { count: todayCount } = await db
        .from("Progress")
        .select("id", { count: "exact", head: true })
        .eq("userId", dbUser.id)
        .or(`reviewedAt.gte.${todayStart.toISOString()},and(createdAt.gte.${todayStart.toISOString()},reviewedAt.is.null)`);
      if ((todayCount ?? 0) >= DAILY_LIMIT) {
        return NextResponse.json({
          limitReached: true,
          dailyLimit: true,
          todayCount: todayCount ?? 0,
          limit: DAILY_LIMIT,
        }, { status: 200 });
      }
    }
    // ─────────────────────────────────────────────────────────────────────
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { questionId, resposta, quality } = await req.json();

  // ── Verifica gabarito SERVER-SIDE (nunca confia no cliente) ──────────────────
  // O campo `correct` do body foi removido — agora o backend busca a resposta correta
  // no banco e compara com a `resposta` enviada pelo aluno.
  const { data: questionData } = await db
    .from("Question")
    .select("answer")
    .eq("id", questionId)
    .maybeSingle();

  // Se questão não encontrada, marca como errada (conservador)
  const isCorrect: boolean = questionData
    ? (resposta ?? "").toUpperCase() === (questionData.answer as string)
    : false;

  // Mapeia qualidades do frontend para o SM-2
  // "errei"/"nao-lembrei" → "again" | "dificil" → "hard" | "ok"/"lembrei" → "ok" | "facil" → "easy"
  const rawQ = quality ?? (isCorrect ? "ok" : "again");
  const q = rawQ === "lembrei"      ? "ok"
          : rawQ === "nao-lembrei"  ? "again"
          : rawQ === "errei"        ? "again"
          : rawQ === "dificil"      ? "hard"
          : rawQ === "facil"        ? "easy"
          : rawQ;

  // Busca progresso existente APENAS para este perfil (nunca misturar legados)
  const existingQuery = db
    .from("Progress")
    .select("id, interval, easeFactor")
    .eq("userId", dbUser.id)
    .eq("questionId", questionId);

  const { data: existing } = await (
    profileId
      ? existingQuery.eq("profileId", profileId)
      : existingQuery.is("profileId", null)
  ).maybeSingle();

  const { interval, easeFactor, nextReview } = calcNextReview(existing, q);

  if (existing) {
    await db.from("Progress").update({
      correct: isCorrect, interval, easeFactor,
      nextReview,
      reviewedAt: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    const { error: insertErr } = await db.from("Progress").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id, profileId, questionId, correct: isCorrect,
      interval, easeFactor, nextReview,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    if (insertErr) console.error("Progress insert error:", insertErr.message);
  }

  // Incrementa uso semanal de questões (compartilhado workspace + /questoes)
  if (weeklyLimit > 0 && weeklyLimit < 9999) {
    void incrementWeeklyResourceUsage(dbUser.id, "questoes").catch(() => {});
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
