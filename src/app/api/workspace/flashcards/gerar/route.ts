import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { defaultAiLimiter } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const FLASH_SYSTEM =
  "Você é um especialista em didática e elaboração de flashcards para concursos públicos brasileiros. Crie flashcards precisos, objetivos e no estilo das bancas.";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { getAccessLevel } = await import("@/lib/access");
  const access = await getAccessLevel();
  if (access.maxFlashcardsPerWeek === 0) {
    return NextResponse.json({ error: "Geração de flashcards não disponível no seu plano." }, { status: 403 });
  }

  // Rate limit: mesma fila que o chat IA
  const rl = await defaultAiLimiter.check(dbUser.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const body = await req.json() as { subjectId?: string; subjectName?: string; qty?: number; topico?: string };
  const { subjectId, subjectName, qty = 10, topico } = body;

  if (!subjectId || !subjectName) {
    return NextResponse.json({ error: "subjectId e subjectName são obrigatórios" }, { status: 400 });
  }

  // Verifica se a matéria existe
  const { data: subject } = await db.from("Subject").select("id, name").eq("id", subjectId).maybeSingle();
  if (!subject) return NextResponse.json({ error: "Matéria não encontrada" }, { status: 404 });

  // Busca perfil do aluno para personalizar
  const { data: profile } = await db
    .from("StudentProfile")
    .select("cargo, orgao")
    .eq("userId", dbUser.id)
    .maybeSingle();

  const count = Math.min(20, Math.max(5, qty));
  const topicoLine = topico ? `\nFoco específico neste tópico: ${topico}` : "";
  const perfilLine = profile?.cargo ? `\nCargo alvo do aluno: ${profile.cargo} (${profile.orgao ?? "N/A"})` : "";

  const prompt = `Gere EXATAMENTE ${count} flashcards sobre: ${subjectName}${topicoLine}${perfilLine}

Regras:
- Frente: pergunta direta e objetiva no estilo de concurso público (20-60 palavras)
- Verso: resposta concisa (1-3 linhas), citando artigo/lei/súmula/jurisprudência quando aplicável
- Cubra subtópicos variados dentro da matéria, priorizando o que mais cai em provas
- Evite repetição de conteúdo entre os cards

Retorne APENAS JSON válido, sem markdown ou texto adicional:
{"cards":[{"frente":"pergunta clara","verso":"resposta com referência legal se aplicável"}]}`;

  let cards: { id: string; front: string; back: string }[];
  try {
    // Tenta Haiku primeiro; cai para Sonnet se falhar
    let msg;
    try {
      msg = await createWithCache({
        model: MODELS.haiku,
        maxTokens: 4000,
        systemPrompt: FLASH_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (haikuErr) {
      log.warn("ai.flashcards_haiku_fallback_sonnet", {}, haikuErr);
      msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 4000,
        systemPrompt: FLASH_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    }
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = extractJSON<{ cards: { frente: string; verso: string }[] }>(raw);
    cards = (parsed.cards ?? []).map((c, i) => ({
      id: `${Date.now()}-${i}`,
      front: c.frente,
      back: c.verso,
    }));
  } catch (err) {
    log.error("ai.flashcards_gerar_error", {}, err);
    return NextResponse.json({ error: "Erro ao gerar flashcards" }, { status: 500 });
  }

  if (cards.length === 0) {
    return NextResponse.json({ error: "IA não retornou cards" }, { status: 500 });
  }

  const deckName = topico
    ? `${subjectName} — ${topico}`
    : `${subjectName} — IA ${new Date().toLocaleDateString("pt-BR")}`;

  const { data: set, error } = await db.from("FlashcardSet").insert({
    id: crypto.randomUUID(),
    userId: dbUser.id,
    subjectId,
    name: deckName,
    cards,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select("id, name, cards, subjectId, createdAt").single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(set, { status: 201 });
}
