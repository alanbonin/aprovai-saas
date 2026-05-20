import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";

const NOTE_PREFIX = "__ARTIGOS_COBRADOS__";
const MAX_HISTORY = 10; // máximo de gerações salvas por matéria por aluno

const SYSTEM_PROMPT =
  "Você é um especialista em concursos públicos brasileiros com profundo conhecimento sobre quais artigos, leis, súmulas e tópicos são mais cobrados em provas. Responda apenas com JSON válido.";

type HistoryEntry = {
  id: string;
  generatedAt: string;
  subjectName: string;
  artigos: unknown[];
};

type StoredData = {
  history: HistoryEntry[];
};

async function getDbUser(supabaseId: string) {
  const { data } = await db.from("User").select("id").eq("supabaseId", supabaseId).single();
  return data;
}

// GET — retorna histórico completo (ou entrada específica)
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json({ history: [] });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ history: [] });

  const cacheKey = `${NOTE_PREFIX}:${subjectId}`;
  const { data: note } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", cacheKey)
    .maybeSingle();

  if (!note?.content) return NextResponse.json({ history: [] });

  try {
    const stored = JSON.parse(note.content) as StoredData;
    const history = stored.history ?? [];
    // Compatibilidade com formato antigo (geração única sem history)
    if (!Array.isArray(stored.history) && (stored as unknown as { artigos: unknown[] }).artigos) {
      const old = stored as unknown as { artigos: unknown[]; subjectName: string; generatedAt: string };
      return NextResponse.json({
        history: [{
          id: "legacy",
          generatedAt: old.generatedAt,
          subjectName: old.subjectName,
          artigos: old.artigos,
        }],
      });
    }
    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ history: [] });
  }
}

// POST — gera artigos com IA e adiciona ao histórico
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
    // Haiku primeiro (mais rápido), cai para Sonnet se falhar
    let msg;
    try {
      msg = await createWithCache({
        model: MODELS.haiku,
        maxTokens: 4000,
        systemPrompt: SYSTEM_PROMPT,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (haikuErr) {
      console.error("[artigos] Haiku falhou, tentando Sonnet:", haikuErr);
      msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 4000,
        systemPrompt: SYSTEM_PROMPT,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    }

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = extractJSON<{ artigos: unknown[] }>(raw);
    artigos = parsed.artigos ?? [];

    if (artigos.length === 0) {
      console.error("[artigos] IA retornou array vazio. Raw:", raw.slice(0, 200));
      return NextResponse.json({ error: "IA não retornou artigos" }, { status: 500 });
    }
  } catch (err) {
    console.error("[artigos] Erro completo:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro ao gerar artigos com IA: ${msg}` }, { status: 500 });
  }

  // Monta nova entrada de histórico
  const newEntry: HistoryEntry = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    subjectName,
    artigos,
  };

  // Carrega histórico existente
  const cacheKey = `${NOTE_PREFIX}:${subjectId}`;
  const { data: existingNote } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", cacheKey)
    .maybeSingle();

  let history: HistoryEntry[] = [];
  if (existingNote?.content) {
    try {
      const stored = JSON.parse(existingNote.content) as StoredData;
      if (Array.isArray(stored.history)) {
        history = stored.history;
      } else {
        // Migra formato antigo
        const old = stored as unknown as { artigos: unknown[]; subjectName: string; generatedAt: string };
        if (old.artigos) {
          history = [{ id: "legacy", generatedAt: old.generatedAt, subjectName: old.subjectName, artigos: old.artigos }];
        }
      }
    } catch { /* ignora erro de parse */ }
  }

  // Adiciona nova entrada no topo e limita ao máximo
  history = [newEntry, ...history].slice(0, MAX_HISTORY);
  const content = JSON.stringify({ history });
  const now = new Date().toISOString();

  if (existingNote?.id) {
    await db.from("Note").update({ content, updatedAt: now }).eq("id", existingNote.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      subjectId: cacheKey,
      content,
      createdAt: now,
      updatedAt: now,
    });
  }

  return NextResponse.json({ entry: newEntry, history });
}
