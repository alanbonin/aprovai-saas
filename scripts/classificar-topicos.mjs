#!/usr/bin/env node
/**
 * classificar-topicos.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Classifica questões sem tópico (topicId = null) para o tópico correto da
 * sua matéria usando GPT-4o-mini.
 *
 * Funcionamento:
 *   1. Busca todas as questões sem topicId agrupadas por matéria
 *   2. Para cada matéria, busca os tópicos disponíveis
 *   3. Envia lotes de 50 questões ao GPT com a lista de tópicos
 *   4. Atualiza topicId no banco em batches
 *   5. Salva progresso em .classificar-progress.json (retomável)
 *
 * Uso:
 *   node --env-file=.env scripts/classificar-topicos.mjs
 *   node --env-file=.env scripts/classificar-topicos.mjs --dry
 *   node --env-file=.env scripts/classificar-topicos.mjs --subject "Língua Portuguesa"
 *   node --env-file=.env scripts/classificar-topicos.mjs --reset
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(__dirname, ".classificar-progress.json");
const BATCH_SIZE = 50;        // questões por chamada de IA
const DB_BATCH_SIZE = 200;    // updates por request Supabase
const CONCURRENCY = 3;        // matérias processadas em paralelo
const MAX_RETRIES = 3;

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const RESET = args.includes("--reset");
const FILTER_SUBJECT = (() => {
  const idx = args.indexOf("--subject");
  return idx >= 0 ? args[idx + 1] : null;
})();

// ── Clientes ─────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Progresso ─────────────────────────────────────────────────────────────────
function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: {}, stats: { classificadas: 0, puladas: 0, erros: 0 } };
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
  } catch {
    return { done: {}, stats: { classificadas: 0, puladas: 0, erros: 0 } };
  }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── Extrai JSON ───────────────────────────────────────────────────────────────
function extractJSON(text) {
  // Remove markdown code blocks (```json ... ``` ou ``` ... ```)
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Tenta encontrar array JSON
  const match = stripped.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  try { return JSON.parse(stripped); } catch {}
  // Fallback no texto original
  const match2 = text.match(/\[[\s\S]*\]/);
  if (match2) {
    try { return JSON.parse(match2[0]); } catch {}
  }
  return null;
}

// ── Prompt de classificação ───────────────────────────────────────────────────
function buildPrompt(topicos, questoes) {
  const topicosStr = topicos
    .map(t => `  - id: "${t.id}" | nome: "${t.name}"`)
    .join("\n");

  const questoesStr = questoes
    .map((q, i) => `  ${i + 1}. [id:${q.id}] ${q.statement.slice(0, 250)}`)
    .join("\n\n");

  return `Você é um classificador de questões de concursos públicos brasileiros.

Classifique cada questão abaixo no tópico mais adequado da lista fornecida.

TÓPICOS DISPONÍVEIS:
${topicosStr}

QUESTÕES PARA CLASSIFICAR:
${questoesStr}

Retorne APENAS um array JSON com objetos { "questionId": <id_da_questao>, "topicId": "<id_do_topico>" }.
Não inclua texto fora do JSON. Use o topicId mais adequado para cada questão.
Se nenhum tópico for adequado, use o topicId do tópico mais geral.`;
}

// ── Classifica um lote de questões ───────────────────────────────────────────
async function classificarLote(topicos, questoes) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Você é um classificador preciso. Retorne apenas JSON válido, sem texto adicional.",
          },
          {
            role: "user",
            content: buildPrompt(topicos, questoes),
          },
        ],
      });

      const raw = (completion.choices[0].message.content ?? "").trim();
      const parsed = extractJSON(raw);
      if (!Array.isArray(parsed)) throw new Error("Resposta inválida: " + raw.slice(0, 200));

      // Valida que os topicIds retornados são válidos
      const validTopicIds = new Set(topicos.map(t => t.id));
      return parsed.filter(r => r.questionId && r.topicId && validTopicIds.has(r.topicId));
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const wait = attempt * 2000;
      process.stdout.write(` ⚠️ tentativa ${attempt} falhou, aguardando ${wait}ms...\n`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ── Atualiza topicIds no banco em lote ───────────────────────────────────────
async function atualizarBanco(classificacoes) {
  // Supabase não tem bulk update por IDs diferentes, então fazemos por topicId
  // Agrupamos por topicId e fazemos um PATCH por grupo
  const porTopico = {};
  for (const c of classificacoes) {
    if (!porTopico[c.topicId]) porTopico[c.topicId] = [];
    porTopico[c.topicId].push(Number(c.questionId));
  }

  let total = 0;
  for (const [topicId, ids] of Object.entries(porTopico)) {
    // Processa em sub-lotes para não exceder limite do Supabase
    for (let i = 0; i < ids.length; i += DB_BATCH_SIZE) {
      const chunk = ids.slice(i, i + DB_BATCH_SIZE);
      const { error } = await db
        .from("Question")
        .update({ topicId })
        .in("id", chunk);

      if (error) throw new Error(`DB update erro: ${error.message}`);
      total += chunk.length;
    }
  }
  return total;
}

// ── Processa uma matéria ──────────────────────────────────────────────────────
async function processarMateria(subject, topicos, progress) {
  const nomeMateria = subject.name.padEnd(35, " ").slice(0, 35);

  // Busca questões sem topicId dessa matéria (paginando)
  const todasQuestoes = [];
  let page = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await db
      .from("Question")
      .select("id, statement")
      .eq("subjectId", subject.id)
      .is("topicId", null)
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (error) throw new Error(`Busca questões: ${error.message}`);
    if (!data || data.length === 0) break;
    todasQuestoes.push(...data);
    if (data.length < PAGE) break;
    page++;
  }

  if (todasQuestoes.length === 0) {
    process.stdout.write(`  ⏭️  ${nomeMateria} — sem questões para classificar\n`);
    progress.done[subject.id] = true;
    saveProgress(progress);
    return 0;
  }

  process.stdout.write(`\n📚 ${nomeMateria} — ${todasQuestoes.length} questões | ${topicos.length} tópicos\n`);

  if (DRY) {
    process.stdout.write(`  [DRY] Pulando ${todasQuestoes.length} questões\n`);
    return 0;
  }

  let classificadas = 0;
  const lotes = Math.ceil(todasQuestoes.length / BATCH_SIZE);

  for (let i = 0; i < todasQuestoes.length; i += BATCH_SIZE) {
    const lote = todasQuestoes.slice(i, i + BATCH_SIZE);
    const loteNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`  🔍 Lote ${loteNum}/${lotes} (${lote.length} questões)...`);

    const resultados = await classificarLote(topicos, lote);
    const atualizadas = await atualizarBanco(resultados);

    classificadas += atualizadas;
    progress.stats.classificadas += atualizadas;
    progress.stats.puladas += lote.length - resultados.length;

    process.stdout.write(` ✅ ${atualizadas} classificadas\n`);
    saveProgress(progress);

    // Pequeno delay para não sobrecarregar API
    if (i + BATCH_SIZE < todasQuestoes.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  progress.done[subject.id] = true;
  saveProgress(progress);

  process.stdout.write(`  📊 Total classificado: ${classificadas}/${todasQuestoes.length}\n`);
  return classificadas;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Classificador de Tópicos — AprovAI\n");

  if (RESET && existsSync(PROGRESS_FILE)) {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(PROGRESS_FILE);
    console.log("🗑️  Progresso resetado\n");
  }

  const progress = loadProgress();

  // Busca matérias
  let subjectsQuery = db.from("Subject").select("id, name, slug, categoria").order("categoria").order("name");
  if (FILTER_SUBJECT) {
    subjectsQuery = subjectsQuery.ilike("name", `%${FILTER_SUBJECT}%`);
  }
  const { data: subjects, error: subErr } = await subjectsQuery;
  if (subErr) throw new Error(`Busca matérias: ${subErr.message}`);

  // Filtra matérias já processadas
  const pendentes = subjects.filter(s => !progress.done[s.id]);
  console.log(`📋 ${subjects.length} matérias | ${pendentes.length} pendentes | ${Object.keys(progress.done).length} concluídas`);

  if (DRY) console.log("🟡 MODO DRY — nenhuma alteração será feita\n");

  // Busca todos os tópicos de uma vez
  const { data: allTopics, error: topErr } = await db
    .from("Topic")
    .select("id, name, subjectId")
    .order("ordem");
  if (topErr) throw new Error(`Busca tópicos: ${topErr.message}`);

  const topicosPorMateria = {};
  for (const t of allTopics) {
    if (!topicosPorMateria[t.subjectId]) topicosPorMateria[t.subjectId] = [];
    topicosPorMateria[t.subjectId].push(t);
  }

  // Verifica matérias sem tópicos definidos
  const materiasSemTopicos = pendentes.filter(s => !topicosPorMateria[s.id]?.length);
  if (materiasSemTopicos.length > 0) {
    console.log(`\n⚠️  ${materiasSemTopicos.length} matérias sem tópicos definidos (serão puladas):`);
    for (const s of materiasSemTopicos) console.log(`   - ${s.name}`);
  }

  const materiasComTopicos = pendentes.filter(s => topicosPorMateria[s.id]?.length > 0);
  console.log(`\n▶️  Processando ${materiasComTopicos.length} matérias com tópicos...\n`);

  // Estima custo
  const { data: totalSemTopico } = await db
    .from("Question")
    .select("id", { count: "exact", head: true })
    .is("topicId", null)
    .in("subjectId", materiasComTopicos.map(s => s.id));

  // Processa em paralelo por grupos
  let totalClassificadas = 0;
  for (let i = 0; i < materiasComTopicos.length; i += CONCURRENCY) {
    const grupo = materiasComTopicos.slice(i, i + CONCURRENCY);
    const resultados = await Promise.all(
      grupo.map(subject => processarMateria(subject, topicosPorMateria[subject.id] ?? [], progress))
    );
    totalClassificadas += resultados.reduce((a, b) => a + b, 0);
  }

  console.log("\n" + "═".repeat(60));
  console.log(`✅ Concluído!`);
  console.log(`   Classificadas:  ${progress.stats.classificadas.toLocaleString("pt-BR")}`);
  console.log(`   Puladas (erro):  ${progress.stats.puladas.toLocaleString("pt-BR")}`);
  console.log(`═`.repeat(60));
}

main().catch(err => {
  console.error("\n❌ Erro fatal:", err.message);
  process.exit(1);
});
