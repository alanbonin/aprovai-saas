#!/usr/bin/env node
/**
 * corrigir-justificativas.mjs
 * Corrige justificativas que referenciam letra errada — usa GPT-4o-mini
 * Uso: node --env-file=.env scripts/corrigir-justificativas.mjs
 */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv(f) {
  const p = join(__dir, '..', f);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq < 0 || line.trim().startsWith('#')) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv('.env'); loadEnv('.env.local');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PROGRESS_FILE = join(__dir, '.corrigir-progress.json');
const CONCURRENCY = 10;

function loadProgress() {
  if (existsSync(PROGRESS_FILE)) return new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')));
  return new Set();
}
function saveProgress(done) {
  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
}

// Detecta justificativa com letra errada
function temProblema(explanation, answer) {
  const matches = [...(explanation ?? '').matchAll(/(?:alternativa|letra)\s+([A-E])\b/gi)];
  return matches.some(m => m[1].toUpperCase() !== answer?.toUpperCase());
}

async function corrigirJustificativa(q) {
  const alternativas = [
    `A) ${q.optionA}`, `B) ${q.optionB}`, `C) ${q.optionC}`,
    `D) ${q.optionD}`, `E) ${q.optionE}`
  ].join('\n');

  const prompt = `Reescreva a justificativa abaixo para esta questão de concurso público, corrigindo-a.

QUESTÃO: ${q.statement}

ALTERNATIVAS:
${alternativas}

GABARITO CORRETO: ${q.answer}
ALTERNATIVA CORRETA (conteúdo): ${q[`option${q.answer}`]}

JUSTIFICATIVA ATUAL (com erro): ${q.explanation}

REGRAS para a nova justificativa:
- 1-2 frases explicando POR QUE a alternativa correta está certa
- NUNCA mencione letras (A, B, C, D, E) — explique pelo CONTEÚDO
- Se houver artigo/lei relevante, mencione-o
- Seja preciso e direto

Responda APENAS com o texto da nova justificativa, sem aspas, sem explicações adicionais.`;

  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'Você corrige justificativas de questões de concurso. Responda apenas com o texto da justificativa corrigida.' },
      { role: 'user', content: prompt },
    ],
  });
  return (r.choices[0].message.content ?? '').trim();
}

async function main() {
  console.log('🔧 Corrigindo justificativas com letra errada...\n');

  const done = loadProgress();
  let pagina = 0, total = 0, corrigidas = 0, erros = 0;
  const toFix = [];

  // Coleta todas com problema
  console.log('📋 Coletando questões com problema...');
  while (true) {
    const { data } = await db.from('Question')
      .select('id, answer, explanation, statement, optionA, optionB, optionC, optionD, optionE')
      .eq('source', 'ia')
      .not('explanation', 'is', null)
      .range(pagina * 1000, pagina * 1000 + 999);
    if (!data || data.length === 0) break;
    total += data.length;
    for (const q of data) {
      if (!done.has(q.id) && temProblema(q.explanation, q.answer)) toFix.push(q);
    }
    if (data.length < 1000) break;
    pagina++;
  }

  console.log(`   Total no banco: ${total}`);
  console.log(`   Com problema: ${toFix.length}`);
  console.log(`   Já corrigidas: ${done.size}`);
  console.log(`   A corrigir agora: ${toFix.length}\n`);

  if (toFix.length === 0) { console.log('✅ Nenhuma para corrigir!'); return; }

  // Processa em paralelo
  let i = 0;
  async function worker() {
    while (i < toFix.length) {
      const q = toFix[i++];
      try {
        const novaJust = await corrigirJustificativa(q);
        if (!novaJust || novaJust.length < 10) throw new Error('Justificativa vazia');

        await db.from('Question').update({ explanation: novaJust }).eq('id', q.id);
        done.add(q.id);
        corrigidas++;

        if (corrigidas % 50 === 0) {
          saveProgress(done);
          console.log(`   ✅ ${corrigidas}/${toFix.length} corrigidas...`);
        }
      } catch (err) {
        erros++;
        console.log(`   ❌ Erro em ${q.id}: ${err.message}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  saveProgress(done);

  console.log(`\n✅ Concluído!`);
  console.log(`   Corrigidas: ${corrigidas}`);
  console.log(`   Erros: ${erros}`);
}

main().catch(console.error);
