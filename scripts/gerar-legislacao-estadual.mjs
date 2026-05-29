#!/usr/bin/env node
/**
 * gerar-legislacao-estadual.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Cria tópicos para as 28 matérias de Legislação Estadual + Direito Eleitoral
 * 2. Gera até 100 questões por tópico usando GPT-4o-mini
 *
 * Uso:
 *   node --env-file=.env scripts/gerar-legislacao-estadual.mjs
 *   node --env-file=.env scripts/gerar-legislacao-estadual.mjs --dry
 *   node --env-file=.env scripts/gerar-legislacao-estadual.mjs --only-topicos  (só cria tópicos)
 *   node --env-file=.env scripts/gerar-legislacao-estadual.mjs --reset
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(__dirname, ".legislacao-estadual-progress.json");

const args = process.argv.slice(2);
const DRY          = args.includes("--dry");
const RESET        = args.includes("--reset");
const ONLY_TOPICOS = args.includes("--only-topicos");
const TARGET       = (() => { const i = args.indexOf("--target"); return i >= 0 ? parseInt(args[i+1]) : 100; })();
const CONCURRENCY  = 3;
const BATCH_Q      = 20; // questões por chamada de IA

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Progresso ──────────────────────────────────────────────────────────────
function loadProgress() {
  if (RESET && existsSync(PROGRESS_FILE)) {
    const { unlinkSync } = require("fs"); // no-op fallback
    try { require("fs").unlinkSync(PROGRESS_FILE); } catch {}
  }
  if (!existsSync(PROGRESS_FILE)) return { done: {}, stats: { topicos: 0, questoes: 0, erros: 0 } };
  try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")); }
  catch { return { done: {}, stats: { topicos: 0, questoes: 0, erros: 0 } }; }
}
function saveProgress(p) { writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

// ── Tópicos por tipo de matéria ────────────────────────────────────────────
function getTopicosParaMateria(nomeMateria) {
  if (nomeMateria === "Direito Eleitoral") {
    return [
      { name: "Código Eleitoral — Princípios e Organização",       slug: "codigo-eleitoral-principios",         ordem: 1 },
      { name: "Partidos Políticos — Lei 9.096/95",                  slug: "partidos-politicos",                  ordem: 2 },
      { name: "Lei das Eleições — Lei 9.504/97",                    slug: "lei-das-eleicoes",                    ordem: 3 },
      { name: "Processo Eleitoral e Recursos",                      slug: "processo-eleitoral-recursos",         ordem: 4 },
      { name: "Crimes Eleitorais e Infrações",                      slug: "crimes-eleitorais-infracoes",         ordem: 5 },
      { name: "Financiamento de Campanhas e Prestação de Contas",   slug: "financiamento-campanhas",             ordem: 6 },
      { name: "Justiça Eleitoral — Estrutura e Competências",       slug: "justica-eleitoral-estrutura",         ordem: 7 },
    ];
  }

  // Para qualquer Legislação Estadual (XX) ou Legislação do DF
  const sigla = nomeMateria.match(/\(([A-Z]{2})\)/)?.[1] ?? "DF";
  const isDF  = nomeMateria.includes("Distrito Federal");
  const uf    = isDF ? "DF" : sigla;

  return [
    { name: `Constituição do Estado / Lei Orgânica do ${uf}`,           slug: `constituicao-lei-organica-${uf.toLowerCase()}`,       ordem: 1 },
    { name: `Estatuto dos Servidores Públicos do ${uf}`,                 slug: `estatuto-servidores-${uf.toLowerCase()}`,             ordem: 2 },
    { name: `Organização Administrativa e Estrutura do Estado do ${uf}`, slug: `organizacao-administrativa-${uf.toLowerCase()}`,      ordem: 3 },
    { name: `Legislação da Segurança Pública do ${uf}`,                  slug: `legislacao-seguranca-publica-${uf.toLowerCase()}`,    ordem: 4 },
    { name: `Direitos e Deveres dos Servidores — ${uf}`,                  slug: `direitos-deveres-servidores-${uf.toLowerCase()}`,     ordem: 5 },
  ];
}

// ── Extrai JSON da resposta ────────────────────────────────────────────────
function extractJSON(text) {
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/) ?? text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  const arr = stripped.match(/\[[\s\S]*\]/) ?? text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  try { return JSON.parse(stripped); } catch {}
  return null;
}

// ── Embaralha alternativas ─────────────────────────────────────────────────
function shuffleAndBuild(alternativas, correta) {
  const opcoes = [...alternativas].sort(() => Math.random() - 0.5);
  const letras = ["A", "B", "C", "D", "E"];
  const corretaIdx = opcoes.indexOf(correta);
  const answer = letras[corretaIdx] ?? "A";
  return {
    optionA: opcoes[0] ?? null, optionB: opcoes[1] ?? null,
    optionC: opcoes[2] ?? null, optionD: opcoes[3] ?? null,
    optionE: opcoes[4] ?? null, answer,
  };
}

// ── Prompt de geração de questões ─────────────────────────────────────────
function buildPrompt({ topicName, subjectName, count }) {
  const isEleitoral = subjectName === "Direito Eleitoral";
  const sigla = subjectName.match(/\(([A-Z]{2})\)/)?.[1] ?? "DF";
  const isDF  = subjectName.includes("Distrito Federal");
  const uf    = isDF ? "DF" : sigla;

  const contexto = isEleitoral
    ? `Gere ${count} questões de concurso público sobre "${topicName}" de Direito Eleitoral. Foque no Código Eleitoral, legislação eleitoral e jurisprudência do TSE.`
    : `Gere ${count} questões de concurso público sobre "${topicName}" da Legislação do estado ${uf}. Foque na legislação estadual específica do ${uf}: leis, estatutos, constituição estadual e atos normativos próprios do estado.`;

  return `${contexto}

Retorne APENAS JSON válido (sem markdown):
{"questoes":[{"enunciado":"...","alternativas":["a","b","c","d","e"],"correta":"texto exato de uma das alternativas","nivel":"facil|medio|dificil","explicacao":"..."}]}

Regras:
- Enunciado claro e objetivo (máx 300 chars)
- 5 alternativas por questão (a correta + 4 incorretas plausíveis)
- Varie os níveis (40% fácil, 40% médio, 20% difícil)
- Explicação concisa (máx 200 chars) justificando a resposta
- NUNCA repita enunciados`;
}

// ── Gera um lote de questões ───────────────────────────────────────────────
async function gerarLote({ topicId, topicName, subjectId, subjectName, count, recentStatements }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const prompt = buildPrompt({ topicName, subjectName, count });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 8192,
        temperature: 0.85,
        messages: [
          { role: "system", content: "Você é um gerador especializado em questões para concursos públicos brasileiros. Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      });

      const raw = (completion.choices[0].message.content ?? "").trim();
      const parsed = extractJSON(raw);
      const questoes = (parsed?.questoes ?? []).filter(q =>
        q.enunciado?.length > 10 && !recentStatements.has(q.enunciado)
      );

      const toInsert = questoes.map(q => {
        const { optionA, optionB, optionC, optionD, optionE, answer } = shuffleAndBuild(q.alternativas, q.correta);
        return {
          subjectId, topicId,
          level: q.nivel ?? "medio",
          statement: q.enunciado,
          optionA, optionB, optionC, optionD, optionE, answer,
          explanation: q.explicacao ?? null,
          source: "ia",
          aprovado: true,
          year: new Date().getFullYear(),
          createdAt: new Date().toISOString(),
        };
      });

      if (toInsert.length === 0) throw new Error("Nenhuma questão válida gerada");

      const { data, error } = await db.from("Question").insert(toInsert).select("id");
      if (error) throw new Error(`DB insert: ${error.message}`);

      questoes.forEach(q => recentStatements.add(q.enunciado));
      return data?.length ?? 0;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  return 0;
}

// ── Processa um tópico ─────────────────────────────────────────────────────
async function processarTopico({ topic, subject, progress }) {
  const key = `q:${topic.id}`;
  if (progress.done[key]) {
    process.stdout.write(`    ⏭️  ${topic.name} — já concluído\n`);
    return 0;
  }

  // Conta questões já existentes
  const { count: existentes } = await db
    .from("Question")
    .select("id", { count: "exact", head: true })
    .eq("topicId", topic.id);

  const faltam = Math.max(0, TARGET - (existentes ?? 0));
  if (faltam === 0) {
    process.stdout.write(`    ✅ ${topic.name} — já tem ${TARGET} questões\n`);
    progress.done[key] = true;
    saveProgress(progress);
    return 0;
  }

  process.stdout.write(`    📝 ${topic.name.slice(0, 50)} — gerando ${faltam} questões...\n`);
  if (DRY) return 0;

  const recentStatements = new Set();
  let total = 0;
  const lotes = Math.ceil(faltam / BATCH_Q);

  for (let i = 0; i < lotes; i++) {
    const count = Math.min(BATCH_Q, faltam - total);
    try {
      const inseridas = await gerarLote({
        topicId: topic.id,
        topicName: topic.name,
        subjectId: subject.id,
        subjectName: subject.name,
        count,
        recentStatements,
      });
      total += inseridas;
      process.stdout.write(`      [${i+1}/${lotes}] +${inseridas} (total: ${total})\n`);
      progress.stats.questoes += inseridas;
      saveProgress(progress);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      process.stdout.write(`      ❌ Lote ${i+1}: ${err.message.slice(0, 60)}\n`);
      progress.stats.erros++;
      saveProgress(progress);
    }
  }

  progress.done[key] = true;
  saveProgress(progress);
  return total;
}

// ── Processa uma matéria ──────────────────────────────────────────────────
async function processarMateria(subject, progress) {
  process.stdout.write(`\n📚 ${subject.name}\n`);

  const keyM = `m:${subject.id}`;
  if (progress.done[keyM]) {
    process.stdout.write(`  ⏭️  Matéria já concluída\n`);
    return;
  }

  // 1. Verifica/cria tópicos
  const { data: topicosExist } = await db.from("Topic")
    .select("*").eq("subjectId", subject.id).order("ordem");

  let topicos = topicosExist ?? [];
  if (topicos.length === 0) {
    const defs = getTopicosParaMateria(subject.name);
    process.stdout.write(`  🗂️  Criando ${defs.length} tópicos...\n`);

    if (!DRY) {
      const rows = defs.map(t => ({
        id: crypto.randomUUID(),
        subjectId: subject.id,
        name: t.name, slug: t.slug, ordem: t.ordem,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const { data: created, error } = await db.from("Topic").insert(rows).select("*");
      if (error) { process.stdout.write(`  ❌ Erro ao criar tópicos: ${error.message}\n`); return; }
      topicos = created ?? [];
      progress.stats.topicos += topicos.length;
      saveProgress(progress);
    }
    defs.forEach(t => process.stdout.write(`    ✅ ${t.name}\n`));
  } else {
    process.stdout.write(`  ✓ ${topicos.length} tópicos já existem\n`);
  }

  if (ONLY_TOPICOS) {
    progress.done[keyM] = true;
    saveProgress(progress);
    return;
  }

  // 2. Gera questões por tópico
  for (const topico of topicos) {
    await processarTopico({ topic: topico, subject, progress });
  }

  progress.done[keyM] = true;
  saveProgress(progress);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("⚖️  Gerador — Legislação Estadual + Direito Eleitoral");
  console.log(`   Target: ${TARGET} questões por tópico | ${DRY ? "DRY RUN" : "MODO REAL"}\n`);

  if (RESET && existsSync(PROGRESS_FILE)) {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(PROGRESS_FILE);
    console.log("🗑️  Progresso resetado\n");
  }

  const progress = loadProgress();

  // Busca as 28 matérias novas
  const { data: subjects, error } = await db
    .from("Subject")
    .select("id, name, slug, categoria")
    .or("name.ilike.Legislação Estadual (%,name.eq.Legislação do Distrito Federal,name.eq.Direito Eleitoral")
    .order("name");

  if (error) { console.error("❌ Erro ao buscar matérias:", error.message); process.exit(1); }

  console.log(`📋 ${subjects?.length ?? 0} matérias encontradas`);
  if (DRY) console.log("🟡 MODO DRY — nenhuma questão será inserida\n");

  // Processa em grupos de CONCURRENCY
  const lista = subjects ?? [];
  for (let i = 0; i < lista.length; i += CONCURRENCY) {
    const grupo = lista.slice(i, i + CONCURRENCY);
    await Promise.all(grupo.map(s => processarMateria(s, progress)));
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅ Concluído!");
  console.log(`   Tópicos criados:  ${progress.stats.topicos}`);
  console.log(`   Questões geradas: ${progress.stats.questoes.toLocaleString("pt-BR")}`);
  console.log(`   Erros:            ${progress.stats.erros}`);
  console.log("═".repeat(60));
}

main().catch(err => { console.error("\n❌ Erro fatal:", err.message); process.exit(1); });
