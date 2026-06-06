import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { autoErroLimiter } from "@/lib/rate-limit";

const PREFIX = "__AUTO_ERRO_FC__";

const SYSTEM = `Você é especialista em concursos públicos brasileiros e criação de flashcards didáticos.
Dado uma questão errada por um aluno, crie 1 flashcard objetivo para fixar o conceito correto.
Responda APENAS com JSON válido, sem markdown.`;

/**
 * POST /api/workspace/flashcards/auto-erro
 * Gera automaticamente um flashcard a partir de uma questão errada.
 * Body: { questionId: number }
 *
 * Salva no deck "Erros Automáticos" do aluno (KV via Note com PREFIX).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const rl = await autoErroLimiter.check(user.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const { questionId } = await req.json() as { questionId: number };
  if (!questionId) return NextResponse.json({ error: "questionId obrigatório" }, { status: 400 });

  // Busca dados da questão
  let qResult = await db.from("Question")
    .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, Subject(name)")
    .eq("id", questionId)
    .eq("aprovado", true)
    .single();
  // Fallback se coluna aprovado não existe ainda
  if (qResult.error && (qResult.error as { code?: string }).code === "42703") {
    qResult = await db.from("Question")
      .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, Subject(name)")
      .eq("id", questionId)
      .single();
  }
  const q = qResult.data;

  if (!q) return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });

  const subject = Array.isArray(q.Subject) ? q.Subject[0] : q.Subject;
  const subjectName = (subject as { name: string } | null)?.name ?? "Concursos";

  // Monta o prompt
  const prompt = `Questão: ${q.statement}

Alternativa correta: ${q.answer}) ${(q as unknown as Record<string, string>)[`option${q.answer as string}`] ?? ""}

Explicação: ${q.explanation ?? "Não fornecida."}

Matéria: ${subjectName}

Crie 1 flashcard no formato:
{"frente": "pergunta direta sobre o conceito", "verso": "resposta objetiva com fundamento legal ou conceito chave"}`;

  let card: { frente: string; verso: string };
  try {
    const res = await createWithCache({
      model: MODELS.haiku,
      maxTokens: 300,
      systemPrompt: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      cacheSystem: false,
    });
    const text = res.content.find(b => b.type === "text")?.text ?? "{}";
    card = extractJSON<{ frente: string; verso: string }>(text);
    if (!card.frente || !card.verso) throw new Error("Card inválido");
  } catch {
    // Fallback: cria flashcard simples sem IA
    card = {
      frente: `O que é correto sobre: ${q.statement.slice(0, 120)}...`,
      verso: `Alternativa ${q.answer}: ${(q as unknown as Record<string, string>)[`option${q.answer as string}`] ?? ""}${q.explanation ? `\n\n${q.explanation.slice(0, 200)}` : ""}`,
    };
  }

  // Carrega deck de erros automáticos do aluno
  const { data: note } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  interface StoredCard {
    id: string; front: string; back: string;
    questionId: number; createdAt: string;
    nextReview?: string; interval?: number; easeFactor?: number;
  }

  let cards: StoredCard[] = [];
  try { cards = JSON.parse(note?.content ?? "[]") as StoredCard[]; } catch { /* ok */ }

  // Evita duplicata para a mesma questão
  const alreadyExists = cards.some(c => c.questionId === questionId);
  if (alreadyExists) {
    return NextResponse.json({ ok: true, duplicate: true, totalCards: cards.length });
  }

  const newCard: StoredCard = {
    id: crypto.randomUUID(),
    front: card.frente,
    back: card.verso,
    questionId,
    createdAt: new Date().toISOString(),
  };

  cards.push(newCard);
  const content = JSON.stringify(cards);

  if (note?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", note.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      subjectId: PREFIX,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, card: newCard, totalCards: cards.length });
}

/**
 * PATCH /api/workspace/flashcards/auto-erro
 * Registra revisão SM-2 de um flashcard do deck de erros.
 * Body: { cardId: string; quality: "lembrei" | "dificil" | "nao-lembrei" }
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { cardId, quality } = await req.json() as { cardId: string; quality: string };
  if (!cardId) return NextResponse.json({ error: "cardId obrigatório" }, { status: 400 });

  const { data: note } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  interface StoredCard {
    id: string; front: string; back: string;
    questionId: number; createdAt: string;
    nextReview?: string; interval?: number; easeFactor?: number;
  }

  let cards: StoredCard[] = [];
  try { cards = JSON.parse(note?.content ?? "[]") as StoredCard[]; } catch { return NextResponse.json({ error: "Deck não encontrado" }, { status: 404 }); }

  const idx = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const card = cards[idx];
  const ease = card.easeFactor ?? 2.5;
  const interval = card.interval ?? 1;

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
    default: // "nao-lembrei"
      newInterval = 1;
      newEase = Math.max(1.3, ease - 0.2);
      break;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  cards[idx] = { ...card, interval: newInterval, easeFactor: newEase, nextReview: nextReview.toISOString() };
  const content = JSON.stringify(cards);

  if (note?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", note.id);
  }

  return NextResponse.json({ ok: true, nextReview: nextReview.toISOString(), interval: newInterval });
}

/**
 * GET /api/workspace/flashcards/auto-erro
 * Retorna os flashcards de erros automáticos do aluno.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { data: note } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let cards = [];
  try { cards = JSON.parse(note?.content ?? "[]"); } catch { /* ok */ }

  return NextResponse.json({ cards, total: cards.length });
}
