import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";

const recentTopicsCache = new Map<string, string[]>();

// Extrai o primeiro objeto JSON completo de um texto que pode ter lixo antes/depois
function extractJSON(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Nenhum JSON encontrado na resposta");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("JSON incompleto na resposta");
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

function shuffleAndBuild(alternativas: string[], correta: string) {
  const letters = ["A", "B", "C", "D", "E"];
  const correctIdx = letters.indexOf(correta.toUpperCase());
  const texts = alternativas.map(a => a.replace(/^[A-E]\)\s*/i, "").trim());
  const indices = [0, 1, 2, 3, 4].slice(0, texts.length);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map(i => texts[i]);
  const newCorrectPos = indices.indexOf(correctIdx < 0 ? 0 : correctIdx);
  return {
    optionA: shuffled[0] ?? null, optionB: shuffled[1] ?? null,
    optionC: shuffled[2] ?? null, optionD: shuffled[3] ?? null,
    optionE: shuffled[4] ?? null, answer: letters[newCorrectPos] ?? "A",
  };
}

// Monta prompt rico usando 2 agentes (cargo + banca)
function buildPrompt(opts: {
  subjectName: string;
  banca: string;
  count: number;
  recentTopics: string[];
  cargoContext: string;
  bancaContext: string;
  extraContext: string;
}) {
  const { subjectName, banca, count, recentTopics, cargoContext, bancaContext, extraContext } = opts;
  const avoidLine = recentTopics.length > 0
    ? `\nNÃO repita estes tópicos já usados: ${recentTopics.join("; ")}.`
    : "";

  return `Você é um gerador especializado de questões para concursos públicos brasileiros.

${cargoContext ? `ESPECIALISTA DO CARGO:\n${cargoContext}\n` : ""}
${bancaContext ? `ESPECIALISTA DA BANCA:\n${bancaContext}\n` : ""}
${extraContext ? `CONTEXTO ADICIONAL: ${extraContext}\n` : ""}

TAREFA: Gere EXATAMENTE ${count} questões INÉDITAS e DISTINTAS de múltipla escolha.
Matéria: ${subjectName}
Banca: ${banca}${avoidLine}

REGRAS OBRIGATÓRIAS:
- Questões 100% no estilo da banca informada (estrutura, vocabulário, nível de pegadinha)
- Varie tópicos dentro de ${subjectName}
- Distribua gabaritos A-E de forma equilibrada
- 5 alternativas plausíveis — distratores tecnicamente plausíveis mas errados
- Cite artigo/lei/súmula REAL no campo "artigo"
- "justificativa": 2-4 frases explicando POR QUE a correta está certa, citando o artigo exato
- "dicaBanca": 1-2 frases sobre o PADRÃO TÍPICO desta banca neste tema — armadilha que ela usa, o que ela gosta de cobrar, dica de prova
- Nível variado: ~30% fácil, 50% médio, 20% difícil

Retorne APENAS JSON válido, sem markdown, sem texto fora do JSON:
{"questoes":[{"enunciado":"texto completo","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"B","topico":"tópico específico","artigo":"Art. X da Lei Y ou Súmula Z do STJ","justificativa":"explicação 2-4 frases citando artigo","dicaBanca":"padrão típico da banca neste tema — armadilha ou dica de prova","nivel":"medio"}]}`;
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const {
    subjectId, subjectName, banca, extraContext, qty = 5,
    cargoAgentId, bancaAgentId,
    // modo lote: array de { subjectId, subjectName, qty }
    lote,
  } = body;

  // ── Modo lote ──────────────────────────────────────────────────
  if (lote && Array.isArray(lote)) {
    let cargoContext = "";
    let bancaContext = "";
    let resolvedBanca = banca || "CESPE/CEBRASPE";

    // Busca agentes
    const agentIds = [cargoAgentId, bancaAgentId].filter(Boolean);
    if (agentIds.length > 0) {
      const { data: agentsData } = await db.from("Agent").select("id, name, systemPrompt, banca, area").in("id", agentIds);
      const agents = agentsData ?? [];
      const cargo = agents.find(a => a.id === cargoAgentId);
      const bancaAgent = agents.find(a => a.id === bancaAgentId);
      if (cargo?.systemPrompt) cargoContext = `${cargo.name}:\n${cargo.systemPrompt.slice(0, 800)}`;
      if (bancaAgent?.systemPrompt) {
        bancaContext = `${bancaAgent.name}:\n${bancaAgent.systemPrompt.slice(0, 800)}`;
        if (!banca && bancaAgent.banca) resolvedBanca = bancaAgent.banca;
      }
    }

    let totalInserido = 0;
    const erros: string[] = [];

    for (const item of lote) {
      const { subjectId: sid, subjectName: sname, qty: sqty = 10 } = item;
      if (!sid || !sname) continue;
      const totalCount = Math.min(50, Math.max(1, sqty));
      const BATCH_SIZE = 5; // máx por chamada para não truncar JSON

      try {
        let remaining = totalCount;
        while (remaining > 0) {
          const count = Math.min(BATCH_SIZE, remaining);
          const recentTopics = recentTopicsCache.get(sid) ?? [];
          const prompt = buildPrompt({ subjectName: sname, banca: resolvedBanca, count, recentTopics, cargoContext, bancaContext, extraContext: extraContext || "" });

          const msg = await createWithCache({
            model: MODELS.haiku,
            maxTokens: 8000,
            systemPrompt: "Você é um gerador especializado de questões para concursos públicos brasileiros. Retorne sempre JSON válido conforme o formato solicitado.",
            messages: [{ role: "user", content: prompt }],
            cacheSystem: true,
          });
          const raw = (msg.content[0] as { type: string; text: string }).text.trim();
          
          const generated = JSON.parse(extractJSON(raw));
          const questoes = generated.questoes ?? [];

          const novosTopic = questoes.map((q: { topico: string }) => q.topico).filter(Boolean);
          recentTopicsCache.set(sid, [...recentTopics, ...novosTopic].slice(-20));

          const toInsert = questoes.map((q: {
            enunciado: string; alternativas: string[]; correta: string;
            topico: string; artigo?: string; justificativa: string; dicaBanca?: string; nivel?: string;
          }) => {
            const { optionA, optionB, optionC, optionD, optionE, answer } = shuffleAndBuild(q.alternativas, q.correta);
            return {
              subjectId: sid,
              banca: resolvedBanca,
              year: new Date().getFullYear(),
              level: q.nivel ?? "medio",
              statement: q.enunciado,
              optionA, optionB, optionC, optionD, optionE,
              answer,
              explanation: q.justificativa ?? null,
              source: "ia",
            };
          });

          if (toInsert.length > 0) {
            const { data, error: insertErr } = await db.from("Question").insert(toInsert).select("id");
            if (insertErr) throw new Error(`DB insert: ${insertErr.message}`);
            totalInserido += data?.length ?? 0;
          }
          remaining -= count;
        }
      } catch (e) {
        const msg2 = (e as Error).message ?? String(e);
        console.error(`[gerar] erro em ${sname}:`, msg2);
        erros.push(`${sname}: ${msg2.slice(0, 120)}`);
      }
    }

    return NextResponse.json({ ok: true, total: totalInserido, erros });
  }

  // ── Modo unitário (compatibilidade) ────────────────────────────
  if (!subjectId || !subjectName) return NextResponse.json({ error: "subjectId e subjectName são obrigatórios" }, { status: 400 });

  const totalCount = Math.min(20, Math.max(1, qty));
  const BATCH_SIZE = 5;

  let cargoContext = "";
  let bancaContext = "";
  let resolvedBanca = banca || "CESPE/CEBRASPE";

  const agentIds = [cargoAgentId, bancaAgentId].filter(Boolean);
  if (agentIds.length > 0) {
    const { data: agentsData } = await db.from("Agent").select("id, name, systemPrompt, banca, area").in("id", agentIds);
    const agents = agentsData ?? [];
    const cargo = agents.find(a => a.id === cargoAgentId);
    const bancaAgent = agents.find(a => a.id === bancaAgentId);
    if (cargo?.systemPrompt) cargoContext = `${cargo.name}:\n${cargo.systemPrompt.slice(0, 800)}`;
    if (bancaAgent?.systemPrompt) {
      bancaContext = `${bancaAgent.name}:\n${bancaAgent.systemPrompt.slice(0, 800)}`;
      if (!banca && bancaAgent.banca) resolvedBanca = bancaAgent.banca;
    }
  }

  const allQuestoes: unknown[] = [];
  let remaining = totalCount;
  while (remaining > 0) {
    const count = Math.min(BATCH_SIZE, remaining);
    const recentTopics = recentTopicsCache.get(subjectId) ?? [];
    const prompt = buildPrompt({ subjectName, banca: resolvedBanca, count, recentTopics, cargoContext, bancaContext, extraContext: extraContext || "" });
    try {
      const msg = await createWithCache({
        model: MODELS.haiku,
        maxTokens: 8000,
        systemPrompt: "Você é um gerador especializado de questões para concursos públicos brasileiros. Retorne sempre JSON válido conforme o formato solicitado.",
        messages: [{ role: "user", content: prompt }],
        cacheSystem: true,
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      
      const generated = JSON.parse(extractJSON(raw));
      const batch = generated.questoes ?? [];
      const novosTopic = batch.map((q: { topico: string }) => q.topico).filter(Boolean);
      recentTopicsCache.set(subjectId, [...recentTopics, ...novosTopic].slice(-20));
      allQuestoes.push(...batch);
    } catch { /* ignora batch com erro */ }
    remaining -= count;
  }

  const generated = { questoes: allQuestoes };

  const questoes = generated.questoes ?? [];
  if (questoes.length === 0) return NextResponse.json({ error: "IA não retornou questões" }, { status: 500 });

  type QItem = { enunciado: string; alternativas: string[]; correta: string; topico: string; artigo?: string; justificativa: string; dicaBanca?: string; nivel?: string; };
  const toInsert = (questoes as QItem[]).map((q) => {
    const { optionA, optionB, optionC, optionD, optionE, answer } = shuffleAndBuild(q.alternativas, q.correta);
    return {
      subjectId,
      banca: resolvedBanca,
      year: new Date().getFullYear(),
      level: q.nivel ?? "medio",
      statement: q.enunciado,
      optionA, optionB, optionC, optionD, optionE,
      answer,
      explanation: q.justificativa ?? null,
      source: "ia",
    };
  });

  const { data, error } = await db.from("Question").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: data?.length ?? 0, questions: data });
}
