#!/usr/bin/env node
/**
 * gerar-flashcards-massa.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Geração massiva de flashcards por TÓPICO via GPT-4o-mini.
 *
 * - CARDS_PER_TOPIC cards por tópico (em batches de BATCH_SIZE para evitar JSON cortado)
 * - CONCURRENCY workers simultâneos
 * - Progress tracking retomável em .gerar-flashcards-progress.json
 * - Retoma de onde parou (pula tópicos já concluídos)
 *
 * Uso:
 *   node --env-file=.env scripts/gerar-flashcards-massa.mjs
 *   node --env-file=.env scripts/gerar-flashcards-massa.mjs --reset
 *   node --env-file=.env scripts/gerar-flashcards-massa.mjs --dry
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Env loader ────────────────────────────────────────────────────────────────
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
const PROGRESS_FILE = join(__dir, ".gerar-flashcards-progress.json");

// ── Configuração ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDry   = args.includes("--dry");
const isReset = args.includes("--reset");

const CARDS_PER_TOPIC = 50;   // total de cards por tópico
const BATCH_SIZE      = 10;   // cards por chamada à API (pequeno = sem JSON cortado)
const CONCURRENCY     = 3;    // workers paralelos
const MAX_RETRIES     = 3;    // tentativas por batch

// ── Clientes ─────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Progress ─────────────────────────────────────────────────────────────────
function loadProgress() {
  if (isReset || !existsSync(PROGRESS_FILE)) return { done: {}, errors: {} };
  try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")); }
  catch { return { done: {}, errors: {} }; }
}
function saveProgress(p) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── Gerar batch de cards (com retry) ─────────────────────────────────────────
async function gerarBatch(topicName, subjectName, quantidade, existingFronts = []) {
  const systemPrompt = `Você é um especialista em criar flashcards didáticos para concursos públicos brasileiros.
Crie ${quantidade} flashcards únicos sobre o tópico "${topicName}" da matéria "${subjectName}".
Cada flashcard deve ter:
- frente: pergunta clara e direta (máximo 120 caracteres)
- verso: resposta objetiva e completa (máximo 300 caracteres)

Foque em:
- Conceitos-chave cobrados em provas
- Definições legais importantes
- Diferenciações que confundem candidatos
- Números, prazos e percentuais relevantes

${existingFronts.length > 0 ? `IMPORTANTE: NÃO repita perguntas similares a estas que já existem:\n${existingFronts.slice(-20).map(f => `- ${f}`).join("\n")}` : ""}

Retorne APENAS um array JSON válido e completo, sem texto antes ou depois:
[{"frente": "pergunta aqui", "verso": "resposta aqui"}]`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: systemPrompt }],
        max_tokens: 2500,
        temperature: 0.7,
      });

      const raw = res.choices[0]?.message?.content ?? "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("JSON não encontrado na resposta");

      const cards = JSON.parse(match[0]);
      if (!Array.isArray(cards) || cards.length === 0) throw new Error("Array vazio");

      // Valida estrutura
      const valid = cards.filter(c => c?.frente && c?.verso);
      if (valid.length === 0) throw new Error("Nenhum card válido");

      return valid;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

// ── Processar um tópico ───────────────────────────────────────────────────────
async function processarTopico(topic, subject, adminUserId, progress) {
  const topicId = topic.id;
  const topicName = topic.name;
  const subjectName = subject.name;
  const catId = subject.categoria ?? "geral";

  // Já concluído?
  if (progress.done[topicId]) return { skip: true };

  const setName = `${topicName} — ${subjectName}`;

  // Verifica se já existe set para esse tópico
  const { data: existing } = await supabase
    .from("FlashcardSet")
    .select("id, cards")
    .eq("userId", adminUserId)
    .eq("name", setName)
    .maybeSingle();

  let existingCards = [];
  let setId = existing?.id ?? null;

  if (existing?.cards) {
    try {
      existingCards = Array.isArray(existing.cards) ? existing.cards : JSON.parse(existing.cards);
    } catch { existingCards = []; }
  }

  // Já tem cards suficientes?
  if (existingCards.length >= CARDS_PER_TOPIC) {
    progress.done[topicId] = existingCards.length;
    return { skip: true };
  }

  const needed = CARDS_PER_TOPIC - existingCards.length;
  const existingFronts = existingCards.map(c => c.front ?? c.frente ?? "").filter(Boolean);

  // Gera em batches de BATCH_SIZE
  const allNewCards = [];
  let remaining = needed;

  while (remaining > 0) {
    const batchQtd = Math.min(BATCH_SIZE, remaining);
    const allFronts = [...existingFronts, ...allNewCards.map(c => c.front)];

    const batch = await gerarBatch(topicName, subjectName, batchQtd, allFronts);
    const formatted = batch.map((c, i) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}-${i}`,
      front: c.frente,
      back: c.verso,
    }));
    allNewCards.push(...formatted);
    remaining -= batch.length;

    // Pequena pausa entre batches do mesmo tópico
    if (remaining > 0) await new Promise(r => setTimeout(r, 300));
  }

  const finalCards = [...existingCards, ...allNewCards];

  // Salva no banco
  if (!isDry) {
    if (setId) {
      await supabase.from("FlashcardSet").update({
        cards: finalCards,
        updatedAt: new Date().toISOString(),
      }).eq("id", setId);
    } else {
      const { data: newSet } = await supabase.from("FlashcardSet").insert({
        userId: adminUserId,
        subjectId: subject.id,
        name: setName,
        cards: finalCards,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).select("id").single();
      setId = newSet?.id;
    }
  }

  return { topicName, subjectName, catId, total: finalCards.length, added: allNewCards.length };
}

// ── Queue com concorrência ────────────────────────────────────────────────────
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  const queue = [...tasks];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) results.push(await task());
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🃏 AprovAI360 — Geração Massiva de Flashcards");
  console.log(`   Cards/tópico: ${CARDS_PER_TOPIC} | Batch: ${BATCH_SIZE} | Workers: ${CONCURRENCY}\n`);

  // Admin user
  const { data: adminUser } = await supabase
    .from("User")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  if (!adminUser) { console.error("❌ Admin não encontrado"); process.exit(1); }
  const adminUserId = adminUser.id;

  // Carrega tópicos + matérias
  const { data: topics } = await supabase
    .from("Topic")
    .select("id, name, subjectId")
    .order("name");

  const { data: subjects } = await supabase
    .from("Subject")
    .select("id, name, categoria");

  if (!topics?.length || !subjects?.length) {
    console.error("❌ Sem tópicos ou matérias no banco"); process.exit(1);
  }

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  // Filtra tópicos válidos
  const toProcess = topics.filter(t => subjectMap[t.subjectId]);

  const progress = loadProgress();

  // Contagem
  const done    = Object.keys(progress.done).length;
  const errors  = Object.keys(progress.errors ?? {}).length;
  const pending = toProcess.filter(t => !progress.done[t.id]).length;

  console.log(`📊 Estado atual:`);
  console.log(`   Total tópicos: ${toProcess.length}`);
  console.log(`   ✅ Concluídos: ${done}`);
  console.log(`   ❌ Erros:      ${errors}`);
  console.log(`   ⏳ Pendentes:  ${pending}\n`);

  if (isDry) {
    const batches = pending * Math.ceil(CARDS_PER_TOPIC / BATCH_SIZE);
    console.log(`💡 Dry-run: ${pending} tópicos × ${Math.ceil(CARDS_PER_TOPIC / BATCH_SIZE)} batches = ${batches} chamadas API`);
    console.log(`   Custo estimado: ~$${(batches * 0.0018).toFixed(2)} USD`);
    process.exit(0);
  }

  if (pending === 0) {
    console.log("🎉 Geração concluída — todos os tópicos já têm flashcards!");
    process.exit(0);
  }

  // Monta tasks
  const pending_topics = toProcess.filter(t => !progress.done[t.id]);
  let completed = 0;
  let errorCount = 0;

  const tasks = pending_topics.map(topic => async () => {
    const subject = subjectMap[topic.subjectId];
    try {
      const result = await processarTopico(topic, subject, adminUserId, progress);
      if (result.skip) return;

      completed++;
      progress.done[topic.id] = result.total;
      if (progress.errors?.[topic.id]) delete progress.errors[topic.id];

      const label = `${result.topicName}`.padEnd(42).slice(0, 42);
      process.stdout.write(
        `  ✅ [${result.catId}] ${label}   ${result.total} cards (+${result.added})\n`
      );

      if (completed % 5 === 0) saveProgress(progress);
    } catch (err) {
      errorCount++;
      if (!progress.errors) progress.errors = {};
      progress.errors[topic.id] = { msg: err.message, at: new Date().toISOString() };
      saveProgress(progress);

      const label = `${topic.name}`.slice(0, 40);
      process.stdout.write(`  ❌ [${label}] erro: ${err.message}\n`);
    }
  });

  await runWithConcurrency(tasks, CONCURRENCY);

  saveProgress(progress);

  const totalDone = Object.keys(progress.done).length;
  const totalErrors = Object.keys(progress.errors ?? {}).length;

  console.log("\n" + "─".repeat(60));
  console.log(`🎉 Geração concluída!`);
  console.log(`   ✅ Concluídos: ${totalDone}`);
  console.log(`   ❌ Erros:      ${totalErrors}`);
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
