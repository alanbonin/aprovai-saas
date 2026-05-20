import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";

const NOTE_PREFIX = "__ARTIGOS_COBRADOS__";

const SYSTEM_PROMPT =
  "Você é um especialista em concursos públicos brasileiros com profundo conhecimento sobre quais artigos, leis, súmulas e tópicos são mais cobrados em provas. Responda apenas com JSON válido.";

// GET — retorna artigos cached ou null
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ artigos: null });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ artigos: null });

  const cacheKey = `${NOTE_PREFIX}:${subjectId}`;
  const { data: cached } = await db
    .from("Note")
    .select("content, updatedAt")
    .eq("userId", dbUser.id)
    .eq("subjectId", cacheKey)
    .maybeSingle();

  if (cached?.content) {
    try {
      return NextResponse.json({ ...JSON.parse(cached.content), cached: true, updatedAt: cached.updatedAt });
    } catch { /* regenera */ }
  }

  return NextResponse.json({ artigos: null });
}

// POST — gera artigos mais cobrados com IA e faz cache
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { subjectId, subjectName } = await req.json() as { subjectId?: string; subjectName?: string };
  if (!subjectId || !subjectName) {
    return NextResponse.json({ error: "subjectId e subjectName são obrigatórios" }, { status: 400 });
  }

  // Busca perfil para personalizar por banca/cargo
  const { data: profile } = await db
    .from("StudentProfile")
    .select("cargo, orgao")
    .eq("userId", dbUser.id)
    .maybeSingle();

  const perfilLine = profile?.cargo
    ? `\nCargo alvo: ${profile.cargo} | Órgão: ${profile.orgao ?? "N/A"}`
    : "";

  const prompt = `Liste os 10 artigos, leis, súmulas e tópicos MAIS COBRADOS em provas de concursos públicos brasileiros para a matéria: ${subjectName}${perfilLine}

Para cada item, forneça TODOS estes campos:
- referencia: identificação precisa (ex: "Art. 37, caput, CF/88", "Súmula 473 STF", "Art. 121 CP")
- topico: o tema/assunto principal desse item (ex: "Princípios LIMPE", "Anulação de atos administrativos")
- frequencia: "muito alta" | "alta" | "media" (frequência de cobrança em provas)
- dica: observação curtíssima sobre o que mais cai nesse ponto (máx. 15 palavras)
- definicao: transcrição ou paráfrase fiel do conteúdo do artigo/súmula/lei em 2-4 linhas, com linguagem clara
- palavras_chave: array com 3 a 5 termos ou expressões centrais desse item para memorização rápida
- pegadinha: a armadilha ou erro mais comum que as bancas costumam explorar nesse ponto (1 frase direta)
- exemplo_prova: trecho ou enunciado típico de como esse item já foi cobrado em prova (1-2 linhas, sem citar banca)

Retorne APENAS JSON válido sem markdown:
{"artigos":[{"referencia":"...","topico":"...","frequencia":"muito alta","dica":"...","definicao":"...","palavras_chave":["..."],"pegadinha":"...","exemplo_prova":"..."}]}`;

  let artigos: unknown[];
  try {
    const msg = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 4000,
      systemPrompt: SYSTEM_PROMPT,
      cacheSystem: true,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = extractJSON<{ artigos: unknown[] }>(raw);
    artigos = parsed.artigos ?? [];
  } catch {
    return NextResponse.json({ error: "Erro ao gerar artigos com IA" }, { status: 500 });
  }

  const result = { artigos, subjectName, generatedAt: new Date().toISOString() };

  // Cache na Note table (sem expiração — artigos mudam pouco)
  const cacheKey = `${NOTE_PREFIX}:${subjectId}`;
  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("userId", dbUser.id)
    .eq("subjectId", cacheKey)
    .maybeSingle();

  if (existing) {
    await db.from("Note")
      .update({ content: JSON.stringify(result), updatedAt: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      subjectId: cacheKey,
      content: JSON.stringify(result),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(result);
}
