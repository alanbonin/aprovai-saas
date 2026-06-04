#!/usr/bin/env node
/**
 * gerar-questoes-massa.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Engine de geração massiva de questões por TÓPICO.
 *
 * Funcionalidades:
 *   - Gera N questões por tópico usando Gemini Flash (10x mais barato que Haiku)
 *   - Paralelismo configurável (N workers simultâneos)
 *   - Progress tracking: salva estado em .gerar-progress.json (retomável)
 *   - Filtros: --category, --subject, --topic, --only-empty
 *   - Dry-run: --dry para ver estimativa sem gerar
 *   - Aprovação automática (aprovado: true) — sem moderação manual
 *   - Sem badge de IA: source fica oculto, questions aparecem normais
 *
 * Uso:
 *   node --env-file=.env scripts/gerar-questoes-massa.mjs
 *   node --env-file=.env scripts/gerar-questoes-massa.mjs --dry
 *   node --env-file=.env scripts/gerar-questoes-massa.mjs --target 100 --concurrency 5
 *   node --env-file=.env scripts/gerar-questoes-massa.mjs --category direito --target 50
 *   node --env-file=.env scripts/gerar-questoes-massa.mjs --only-empty --target 30
 *   node --env-file=.env scripts/gerar-questoes-massa.mjs --reset  (limpa progresso)
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Carrega variáveis de ambiente — parser robusto (compatível com dotenvx)
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eqIdx = t.indexOf("=");
      if (eqIdx < 0) continue;
      const key = t.slice(0, eqIdx).trim();
      let val = t.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignora */ }
}
loadEnvFile(new URL("../.env", import.meta.url).pathname);
loadEnvFile(new URL("../.env.local", import.meta.url).pathname);

const __dir = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(__dir, ".gerar-progress.json");

// ── Configuração via args ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};
const hasFlag = (name) => args.includes(`--${name}`);

const TARGET_PER_TOPIC  = parseInt(getArg("target", "200"), 10);    // questões por tópico
const CONCURRENCY       = parseInt(getArg("concurrency", "4"), 10);  // workers paralelos
const BATCH_SIZE        = parseInt(getArg("batch", "10"), 10);       // questões por chamada API (10 = seguro para Gemini Flash, output generoso)
const FILTER_CATEGORY   = getArg("category", null);
const FILTER_SUBJECT    = getArg("subject", null);
const FILTER_TOPIC      = getArg("topic", null);
const SKIP_CATEGORIES   = new Set((getArg("skip-categories", "") || "").split(",").map(s => s.trim()).filter(Boolean)); // ex: --skip-categories cfc,revalida
const ONLY_EMPTY        = hasFlag("only-empty");  // só tópicos com 0 questões
const DRY_RUN           = hasFlag("dry");
const RESET_PROGRESS    = hasFlag("reset");
const BANCA_DEFAULT     = getArg("banca", "CESPE/CEBRASPE");

// ── Clientes ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Progress tracking ─────────────────────────────────────────────────────────
function loadProgress() {
  if (RESET_PROGRESS && existsSync(PROGRESS_FILE)) {
    writeFileSync(PROGRESS_FILE, JSON.stringify({ done: {}, errors: {} }, null, 2));
    console.log("♻️  Progresso resetado.\n");
  }
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
  }
  return { done: {}, errors: {} };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── JSON extractor ────────────────────────────────────────────────────────────
function extractJSON(text) {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Nenhum JSON encontrado");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  throw new Error("JSON incompleto");
}

// ── Shuffle alternativas ──────────────────────────────────────────────────────
function shuffleAndBuild(alternativas, correta) {
  const letters = ["A", "B", "C", "D", "E"];
  const correctIdx = letters.indexOf((correta || "A").toUpperCase());
  const texts = (alternativas || []).map(a => a.replace(/^[A-E]\)\s*/i, "").trim());
  const n = Math.min(texts.length, 5);
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map(i => texts[i]);
  const newCorrectPos = indices.indexOf(correctIdx < 0 ? 0 : correctIdx);
  return {
    optionA: shuffled[0] ?? null, optionB: shuffled[1] ?? null,
    optionC: shuffled[2] ?? null, optionD: shuffled[3] ?? null,
    optionE: shuffled[4] ?? null,
    answer: letters[newCorrectPos] ?? "A",
  };
}

// ── Prompt por tópico ─────────────────────────────────────────────────────────
function buildPrompt({ topicName, subjectName, categoria, banca, count, recentStatements }) {
  const avoid = recentStatements.length > 0
    ? `\n\nNÃO repita estes enunciados já gerados (evite paráfrases e tópicos similares):\n${recentStatements.slice(-20).map((s, i) => `${i + 1}. ${s.slice(0, 100)}...`).join("\n")}`
    : "";

  // Banca baseada na categoria
  const bancaMap = {
    "banco-central": "CESPE/CEBRASPE", "bancario": "CESGRANRIO", "bancos-publicos": "CESGRANRIO",
    "oab": "FGV", "revalida": "FUFMS/INEP", "cfc": "CFC/IBRACON",
    "enem": "MEC/INEP", "vestibular": "FUVEST",
    "militar": "ESPCEX/AFA", "diplomacia": "CESPE/CEBRASPE",
    "petrobras-estatais": "CESGRANRIO", "tecnologia-informacao": "CESPE/CEBRASPE",
    "controle-auditoria": "CESPE/CEBRASPE", "previdencia-social": "CESPE/CEBRASPE",
    "ambiental-agro": "CESPE/CEBRASPE",
  };
  const resolvedBanca = banca || bancaMap[categoria] || BANCA_DEFAULT;

  return `Você é um gerador especializado de questões para concursos públicos brasileiros.

TAREFA: Gere EXATAMENTE ${count} questões INÉDITAS e DISTINTAS de múltipla escolha sobre o tópico específico abaixo.

TÓPICO ESPECÍFICO: ${topicName}
MATÉRIA: ${subjectName}
BANCA: ${resolvedBanca}${avoid}

REGRAS OBRIGATÓRIAS:
1. Todas as questões devem ser ESPECIFICAMENTE sobre "${topicName}" — não misture com outros tópicos
2. Siga rigorosamente o estilo da banca ${resolvedBanca}: estrutura, vocabulário, nível de pegadinha
3. TIPOS de questão — misture os dois formatos:
   - MÚLTIPLA ESCOLHA (70% das questões): 5 alternativas A-E, distratores plausíveis. Campo "tipo": "multipla"
   - CERTO/ERRADO (30% das questões): estilo CESPE — afirmação que o candidato julga. Campo "tipo": "certo_errado". Alternativas: ["Certo","Errado"]. Correta: "Certo" ou "Errado"
4. Para múltipla escolha: distribua gabaritos A-E equilibradamente
5. Para Certo/Errado: distribua equilibradamente entre Certo e Errado
6. Varie o subtópico de cada questão dentro de "${topicName}"
7. "artigo": cite artigo/lei/súmula/decreto REAL e específico
8. "justificativa": 1-2 frases explicando POR QUE a resposta está certa. Nunca mencione letras na justificativa — explique pelo conteúdo.
9. Nível: 30% medio, 70% dificil — NÃO gere questões fáceis.

Retorne APENAS JSON válido, sem markdown:
{"questoes":[
  {"tipo":"multipla","enunciado":"texto da questão","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"B","subtopico":"subtópico","artigo":"Art. X da Lei Y","justificativa":"explicação","nivel":"dificil"},
  {"tipo":"certo_errado","enunciado":"Afirmação para julgar como certa ou errada.","alternativas":["Certo","Errado"],"correta":"Certo","subtopico":"subtópico","artigo":"Art. X da Lei Y","justificativa":"explicação","nivel":"dificil"}
]}`;
}

// ── Geração de 1 batch para 1 tópico ─────────────────────────────────────────
async function gerarBatch({ topicId, topicName, subjectId, subjectName, categoria, count, recentStatements }) {
  const bancaMap = {
    "banco-central": "CESPE/CEBRASPE", "bancario": "CESGRANRIO", "bancos-publicos": "CESGRANRIO",
    "oab": "FGV", "revalida": "FUFMS/INEP", "cfc": "CFC/IBRACON",
    "enem": "MEC/INEP", "vestibular": "FUVEST",
    "militar": "ESPCEX/AFA", "diplomacia": "CESPE/CEBRASPE",
    "petrobras-estatais": "CESGRANRIO", "tecnologia-informacao": "CESPE/CEBRASPE",
    "controle-auditoria": "CESPE/CEBRASPE", "previdencia-social": "CESPE/CEBRASPE",
    "ambiental-agro": "CESPE/CEBRASPE",
  };
  const banca = bancaMap[categoria] || BANCA_DEFAULT;

  // Retry automático: tenta com count, depois metade, depois 3
  const attemptsCount = [count, Math.ceil(count / 2), 3].filter((v, i, a) => a.indexOf(v) === i && v > 0);
  let lastErr = null;

  for (const tryCount of attemptsCount) {
    try {
      const prompt = buildPrompt({ topicName, subjectName, categoria, banca, count: tryCount, recentStatements });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 8192,
        temperature: 0.9,
        messages: [
          { role: "system", content: "Você é um gerador especializado de questões para concursos públicos brasileiros. Retorne sempre JSON válido conforme o formato solicitado. Nunca inclua texto fora do JSON." },
          { role: "user", content: prompt },
        ],
      });
      const raw = (completion.choices[0].message.content ?? "").trim();
      const parsed = JSON.parse(extractJSON(raw));
      const questoes = (parsed.questoes ?? []).filter(q => q.enunciado && q.enunciado.trim().length > 10);

      const toInsert = questoes.map(q => {
        let optionA, optionB, optionC, optionD, optionE, answer;
        if (q.tipo === "certo_errado") {
          // Questão Certo/Errado — formato CESPE
          optionA = "Certo";
          optionB = "Errado";
          optionC = null; optionD = null; optionE = null;
          answer = q.correta === "Certo" ? "A" : "B";
        } else {
          // Múltipla escolha — embaralha alternativas
          const built = shuffleAndBuild(q.alternativas, q.correta);
          optionA = built.optionA; optionB = built.optionB; optionC = built.optionC;
          optionD = built.optionD; optionE = built.optionE; answer = built.answer;
        }
        const dicas = (q.dicaBanca || q.dicaQuestao)
          ? JSON.stringify({ banca: q.dicaBanca ?? null, questao: q.dicaQuestao ?? null })
          : null;
        return {
          subjectId,
          topicId,
          banca,
          year: new Date().getFullYear(),
          level: q.nivel ?? "medio",
          statement: q.enunciado,
          optionA, optionB, optionC, optionD, optionE,
          answer,
          explanation: q.justificativa ?? null,
          artigo: q.artigo ?? null,
          analysis: dicas,
          source: "ia",
          aprovado: true,
        };
      });

      if (toInsert.length > 0) {
        const { data, error } = await db.from("Question").insert(toInsert).select("id");
        if (error) throw new Error(`DB insert: ${error.message}`);
        return { inserted: data?.length ?? 0, statements: questoes.map(q => q.enunciado) };
      }
      return { inserted: 0, statements: [] };

    } catch (err) {
      lastErr = err;
      const isJsonErr = err.message?.includes("JSON") || err.message?.includes("Unexpected");
      if (isJsonErr && tryCount > 3) {
        // Tenta com batch menor
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err; // erro não-JSON ou já no menor batch: propaga
    }
  }

  throw lastErr ?? new Error("Todos os retries falharam");
}

// ── Worker: gera até TARGET_PER_TOPIC para um tópico ─────────────────────────
async function processarTopico({ topic, subject, progress, stats }) {
  const topicKey = `${topic.id}`;
  // Sempre lê o count real do banco para não ultrapassar o target
  const { count: dbCount } = await db.from("Question")
    .select("id", { count: "exact", head: true })
    .eq("topicId", topic.id)
    .eq("aprovado", true);
  const already = Math.max(progress.done[topicKey] ?? 0, dbCount ?? 0);
  const need = TARGET_PER_TOPIC - already;

  if (need <= 0) {
    stats.skipped++;
    return;
  }

  let totalInserted = already;
  // Busca enunciados já existentes no banco para evitar repetição
  const { data: existingQ } = await db.from("Question")
    .select("statement")
    .eq("topicId", topic.id)
    .eq("aprovado", true)
    .order("createdAt", { ascending: false })
    .limit(20);
  const recentStatements = (existingQ ?? []).map(q => q.statement).filter(Boolean);
  let retries = 0;

  try {
    while (totalInserted < TARGET_PER_TOPIC) {
      const batchCount = Math.min(BATCH_SIZE, TARGET_PER_TOPIC - totalInserted);
      const result = await gerarBatch({
        topicId: topic.id,
        topicName: topic.name,
        subjectId: subject.id,
        subjectName: subject.name,
        categoria: subject.categoria,
        count: batchCount,
        recentStatements,
      });

      totalInserted += result.inserted;
      recentStatements.push(...result.statements);

      progress.done[topicKey] = totalInserted;
      saveProgress(progress);

      stats.questoesGeradas += result.inserted;
      process.stdout.write(`  ✅ [${subject.categoria}] ${topic.name.slice(0, 40).padEnd(42)} ${totalInserted}/${TARGET_PER_TOPIC} (+${result.inserted})\n`);

      // Pequeno delay para não sobrecarregar a API
      if (totalInserted < TARGET_PER_TOPIC) await new Promise(r => setTimeout(r, 300));
    }

    stats.topicsConcluidos++;
  } catch (err) {
    retries++;
    const msg = (err.message ?? String(err)).slice(0, 200);
    console.error(`  ❌ [${topic.name.slice(0, 40)}] erro: ${msg}`);
    progress.errors[topicKey] = { msg, at: new Date().toISOString(), done: totalInserted };
    if (totalInserted > 0) progress.done[topicKey] = totalInserted;
    saveProgress(progress);
    stats.topicsComErro++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 AprovAI360 — Geração Massiva de Questões");
  console.log(`   Target: ${TARGET_PER_TOPIC} questões/tópico | Batch: ${BATCH_SIZE}/chamada | Workers: ${CONCURRENCY}`);
  if (DRY_RUN) console.log("   ⚠️  DRY RUN — nenhuma questão será inserida\n");
  if (FILTER_CATEGORY) console.log(`   Filtro: categoria = "${FILTER_CATEGORY}"`);
  if (FILTER_SUBJECT) console.log(`   Filtro: subject slug = "${FILTER_SUBJECT}"`);
  if (FILTER_TOPIC) console.log(`   Filtro: topic name contém = "${FILTER_TOPIC}"`);
  if (ONLY_EMPTY) console.log(`   Filtro: apenas tópicos com 0 questões`);
  console.log("");

  const progress = loadProgress();

  // ── Carrega todos os tópicos com seus subjects ──────────────────────────────
  let subjectsQuery = db.from("Subject").select("id, slug, name, categoria");
  if (FILTER_CATEGORY) subjectsQuery = subjectsQuery.eq("categoria", FILTER_CATEGORY);
  if (FILTER_SUBJECT) subjectsQuery = subjectsQuery.eq("slug", FILTER_SUBJECT);
  let { data: subjects } = await subjectsQuery;
  if (SKIP_CATEGORIES.size > 0) {
    subjects = (subjects ?? []).filter(s => !SKIP_CATEGORIES.has(s.categoria));
    console.log(`   Categorias ignoradas: ${[...SKIP_CATEGORIES].join(", ")}`);
  }
  if (!subjects?.length) { console.error("Nenhuma matéria encontrada."); process.exit(1); }

  const subjectIds = subjects.map(s => s.id);
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  // Carrega tópicos com paginação (sem limite do Supabase)
  let allTopics = [];
  for (let i = 0; i < subjectIds.length; i += 200) {
    const batch = subjectIds.slice(i, i + 200);
    let page = 0;
    while (true) {
      let q = db.from("Topic").select("id, name, subjectId, ordem")
        .in("subjectId", batch).order("ordem")
        .range(page * 1000, page * 1000 + 999);
      if (FILTER_TOPIC) q = q.ilike("name", `%${FILTER_TOPIC}%`);
      const { data: t } = await q;
      if (!t || t.length === 0) break;
      allTopics.push(...t);
      if (t.length < 1000) break;
      page++;
    }
  }

  // Conta questões existentes por tópico via RPC (mesma função do admin — precisa)
  let questionCounts = {};
  if (ONLY_EMPTY || TARGET_PER_TOPIC > 0) {
    const { data: rpcCounts, error: rpcErr } = await db.rpc("get_question_counts_by_topic");
    if (rpcErr) {
      // Fallback: query direta em chunks com paginação
      const allIds = allTopics.map(t => t.id);
      const CHUNK = 100;
      for (let i = 0; i < allIds.length; i += CHUNK) {
        const chunk = allIds.slice(i, i + CHUNK);
        let page = 0;
        while (true) {
          const { data: qCounts } = await db.from("Question")
            .select("topicId")
            .in("topicId", chunk)
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (!qCounts?.length) break;
          qCounts.forEach(q => {
            if (q.topicId) questionCounts[q.topicId] = (questionCounts[q.topicId] || 0) + 1;
          });
          if (qCounts.length < 1000) break;
          page++;
        }
      }
    } else {
      (rpcCounts ?? []).forEach(row => {
        if (row.topic_id) questionCounts[row.topic_id] = Number(row.question_count);
      });
    }
  }

  // Filtra tópicos que ainda precisam de questões
  let topicsToProcess = allTopics.filter(t => {
    const current = questionCounts[t.id] ?? 0;
    const done = progress.done[t.id] ?? current;
    if (ONLY_EMPTY && current > 0) return false;
    return done < TARGET_PER_TOPIC;
  });

  // Atualiza progresso com contagens reais do DB
  allTopics.forEach(t => {
    const current = questionCounts[t.id] ?? 0;
    if (current > 0 && !progress.done[t.id]) {
      progress.done[t.id] = current;
    }
  });

  // Estatísticas
  const totalTopics = allTopics.length;
  const pendingTopics = topicsToProcess.length;
  const totalQuestoesNecessarias = topicsToProcess.reduce((acc, t) => {
    const done = progress.done[t.id] ?? (questionCounts[t.id] ?? 0);
    return acc + (TARGET_PER_TOPIC - done);
  }, 0);
  const totalApiCalls = Math.ceil(totalQuestoesNecessarias / BATCH_SIZE);
  const estimativaCusto = (totalApiCalls * 0.005).toFixed(2); // ~$0.005 por chamada GPT-4o-mini

  console.log(`📊 Estado atual:`);
  console.log(`   Matérias:         ${subjects.length}`);
  console.log(`   Tópicos total:    ${totalTopics}`);
  console.log(`   Tópicos pendentes:${pendingTopics} (precisam de mais questões)`);
  console.log(`   Questões a gerar: ${totalQuestoesNecessarias.toLocaleString()}`);
  console.log(`   Chamadas API est: ${totalApiCalls.toLocaleString()}`);
  console.log(`   Custo estimado:  ~$${estimativaCusto} (GPT-4o-mini)`);
  console.log(`   Tópicos já feitos:${Object.keys(progress.done).length}`);
  console.log(`   Erros anteriores: ${Object.keys(progress.errors).length}`);
  console.log("");

  if (DRY_RUN) {
    console.log("ℹ️  Dry run concluído. Use sem --dry para iniciar a geração.\n");

    // Mostra distribuição por categoria
    const catStats = {};
    topicsToProcess.forEach(t => {
      const s = subjectMap[t.subjectId];
      const cat = s?.categoria ?? "?";
      if (!catStats[cat]) catStats[cat] = { topics: 0, questoes: 0 };
      catStats[cat].topics++;
      const done = progress.done[t.id] ?? (questionCounts[t.id] ?? 0);
      catStats[cat].questoes += TARGET_PER_TOPIC - done;
    });

    console.log("📋 Por categoria:");
    Object.entries(catStats).sort(([a],[b]) => b[1].questoes - a[1].questoes).forEach(([cat, v]) => {
      console.log(`   ${cat.padEnd(28)} ${String(v.topics).padEnd(6)} tópicos   ${v.questoes.toLocaleString().padStart(8)} questões`);
    });
    return;
  }

  if (pendingTopics === 0) {
    console.log("✅ Todos os tópicos já atingiram o target! Use --reset para regenerar.");
    return;
  }

  console.log(`🎯 Iniciando geração (${CONCURRENCY} workers paralelos)...\n`);

  const stats = { topicsConcluidos: 0, topicsComErro: 0, questoesGeradas: 0, skipped: 0 };
  const startTime = Date.now();

  // Processa em chunks de CONCURRENCY tópicos simultâneos
  for (let i = 0; i < topicsToProcess.length; i += CONCURRENCY) {
    const chunk = topicsToProcess.slice(i, i + CONCURRENCY);
    const eta = i > 0
      ? ` | ETA: ${Math.round((Date.now() - startTime) / 1000 / i * (topicsToProcess.length - i))}s`
      : "";
    console.log(`\n📦 Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(topicsToProcess.length / CONCURRENCY)} [${i + 1}-${Math.min(i + CONCURRENCY, topicsToProcess.length)}/${topicsToProcess.length}]${eta}`);

    await Promise.all(
      chunk.map(topic => processarTopico({
        topic,
        subject: subjectMap[topic.subjectId],
        progress,
        stats,
      }))
    );
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ Geração concluída em ${min}m ${sec}s`);
  console.log(`   Tópicos concluídos: ${stats.topicsConcluidos}`);
  console.log(`   Tópicos com erro:   ${stats.topicsComErro}`);
  console.log(`   Questões geradas:   ${stats.questoesGeradas.toLocaleString()}`);

  // Total no banco
  const { count } = await db.from("Question").select("id", { count: "exact", head: true });
  console.log(`   Total no banco:     ${count?.toLocaleString()} questões`);

  if (stats.topicsComErro > 0) {
    console.log(`\n⚠️  ${stats.topicsComErro} tópicos com erro. Execute novamente para retomar.`);
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
