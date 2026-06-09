import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { updateXP, XP_SIMULADO_PER_ACERTO } from "@/lib/xp";
import { getActiveProfile } from "@/lib/get-active-profile";

// ── SM-2 simplificado (mesmo algoritmo do adaptativo) ────────────────────────
function calcNextReview(
  existing: { interval: number; easeFactor: number } | null,
  quality: "again" | "ok"
) {
  const ease     = existing?.easeFactor ?? 2.5;
  const interval = existing?.interval   ?? 1;
  let newInterval: number;
  let newEase:     number;

  if (quality === "again") {
    newInterval = 1;
    newEase     = Math.max(1.3, ease - 0.2);
  } else {
    // "ok" — avanço conservador (equivalente ao botão "Entendi")
    newInterval = Math.round(interval * ease);
    newEase     = ease; // sem alteração no ease para acertos de simulado
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    interval:    newInterval,
    easeFactor:  newEase,
    nextReview:  nextReview.toISOString(),
    correct:     quality !== "again",
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const { total, timeSecs, subjectIds, answers } = await req.json();

  // ── 0. Verifica gabaritos SERVER-SIDE ─────────────────────────────────────
  // O frontend envia `resposta` (alternativa escolhida) — nunca `correct: boolean`.
  // O backend busca os gabaritos em batch e computa acertos de forma autoritativa.
  const validAnswers = Array.isArray(answers) ? answers as { questionId: number; resposta?: string }[] : [];
  const safeTotal = Math.min(Math.max(0, total ?? validAnswers.length), 200);

  let serverCorrect = 0;
  const answersWithResult: { questionId: number; isCorrect: boolean }[] = [];

  if (validAnswers.length > 0) {
    const qIds = validAnswers.map(a => a.questionId);
    const { data: gabaritos } = await db
      .from("Question")
      .select("id, answer")
      .in("id", qIds);

    const gabaritoMap = new Map((gabaritos ?? []).map(g => [g.id as number, g.answer as string]));

    for (const a of validAnswers) {
      const correct = gabaritoMap.has(a.questionId) && (a.resposta ?? "").toUpperCase() === gabaritoMap.get(a.questionId);
      if (correct) serverCorrect++;
      answersWithResult.push({ questionId: a.questionId, isCorrect: correct });
    }
  }

  // ── 1. Salva no histórico ─────────────────────────────────────────────────
  const { error } = await db.from("SimuladoHistory").insert({
    userId:     dbUser.id,
    profileId,
    total:      safeTotal,
    correct:    serverCorrect,   // sempre server-computed
    timeSecs:   timeSecs   ?? 0,
    subjectIds: subjectIds ?? [],
  });

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  // ── 2. Atualiza Progress com SM-2 inteligente ─────────────────────────────
  if (validAnswers.length > 200) {
    return NextResponse.json({ error: "Número de respostas inválido" }, { status: 400 });
  }

  if (answersWithResult.length > 0) {
    const questionIds = answersWithResult.map(a => a.questionId);

    // Busca registros existentes de uma vez
    const { data: existingRows } = await db
      .from("Progress")
      .select("id, questionId, interval, easeFactor, nextReview, correct")
      .eq("userId", dbUser.id)
      .in("questionId", questionIds);

    const existingMap = new Map(
      (existingRows ?? []).map(r => [r.questionId as number, r])
    );

    const now    = new Date().toISOString();
    const today  = now.slice(0, 10);
    const toInsert: object[] = [];
    const toUpdate: { id: string; fields: object }[] = [];

    for (const a of answersWithResult) {
      const existing = existingMap.get(a.questionId);

      // ── Regra de mescla SM-2 ──────────────────────────────────────────────
      // ERRO  → always "again" (nextReview = amanhã)
      // ACERTO sem agendamento (sem Progress) → "ok" (primeira vez no SM-2)
      // ACERTO questão vencida (nextReview ≤ hoje) → "ok" (avança intervalo)
      // ACERTO questão não vencida (nextReview > hoje) → não toca
      // ─────────────────────────────────────────────────────────────────────
      const nextReviewDate = (existing?.nextReview as string | null | undefined) ?? null;
      const isDue    = existing && nextReviewDate !== null && nextReviewDate.slice(0, 10) <= today;
      const isNew    = !existing;
      const isWrong  = !a.isCorrect;

      const shouldUpdate = isWrong || isNew || isDue;
      if (!shouldUpdate) continue;

      const quality: "again" | "ok" = isWrong ? "again" : "ok";
      const sm2 = calcNextReview(
        existing
          ? { interval: existing.interval as number, easeFactor: existing.easeFactor as number }
          : null,
        quality
      );

      if (existing) {
        toUpdate.push({
          id: existing.id as string,
          fields: {
            correct:    sm2.correct,
            interval:   sm2.interval,
            easeFactor: sm2.easeFactor,
            nextReview: sm2.nextReview,
            reviewedAt: now,
            profileId,
          },
        });
      } else {
        toInsert.push({
          userId:     dbUser.id,
          profileId,
          questionId: a.questionId,
          correct:    sm2.correct,
          interval:   sm2.interval,
          easeFactor: sm2.easeFactor,
          nextReview: sm2.nextReview,
          reviewedAt: now,
          createdAt:  now,
        });
      }
    }

    // Insere novos em batch
    if (toInsert.length > 0) {
      await db.from("Progress").insert(toInsert);
    }

    // Atualiza existentes individualmente (Supabase não faz batch update por PK diferente)
    await Promise.all(
      toUpdate.map(({ id, fields }) =>
        db.from("Progress").update(fields).eq("id", id)
      )
    );
  }

  // ── 3. XP pelo simulado: 3 XP por acerto (server-computed) ───────────────
  const xpDelta = serverCorrect * XP_SIMULADO_PER_ACERTO;
  void updateXP(dbUser.id, xpDelta).catch(() => {});

  // ── 4. Notificação in-app de simulado concluído ───────────────────────────
  // O sistema de notificações usa Note como KV store com prefixos.
  // Persiste o último simulado concluído para o GET /api/notificacoes capturar.
  const score = safeTotal > 0 ? Math.round((serverCorrect / safeTotal) * 100) : 0;
  const SIMULADO_NOTIF_PREFIX = "__SIMULADO_NOTIF__";
  const notifPayload = JSON.stringify({
    correct: serverCorrect,
    total:   safeTotal,
    score,
    at:      new Date().toISOString(),
  });
  // Upsert: remove anterior e insere o novo (mantém apenas o último simulado)
  void (async () => {
    try {
      await db.from("Note").delete()
        .eq("userId", dbUser.id).eq("subjectId", SIMULADO_NOTIF_PREFIX);
      await db.from("Note").insert({
        id:        crypto.randomUUID(),
        userId:    dbUser.id,
        subjectId: SIMULADO_NOTIF_PREFIX,
        content:   notifPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch { /* silencioso — não quebra o fluxo */ }
  })();

  // Retorna resultados por questão para o frontend atualizar a tela de revisão
  return NextResponse.json({
    ok: true,
    correct: serverCorrect,
    total: safeTotal,
    results: answersWithResult,
  });
}
