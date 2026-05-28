#!/usr/bin/env node
/**
 * comparar-modelos.mjs — Compara Claude Haiku vs GPT-4o-mini lado a lado
 * Uso: node scripts/comparar-modelos.mjs
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Carrega .env
const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv(file) {
  const p = join(__dir, "..", file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf-8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 0 || line.trim().startsWith("#")) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(".env");
loadEnv(".env.local");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT = `Gere EXATAMENTE 3 questões de múltipla escolha sobre o tópico abaixo para concursos públicos brasileiros.

TÓPICO: Princípios da Administração Pública (LIMPE)
MATÉRIA: Direito Administrativo
BANCA: CESPE/CEBRASPE

Gere:
- 1 questão de nível FÁCIL
- 1 questão de nível MÉDIO
- 1 questão de nível DIFÍCIL

REGRAS:
1. 5 alternativas (A-E) com distratores tecnicamente plausíveis
2. Artigo/lei real e específico (ex: "Art. 37, caput, da CF/88")
3. Justificativa de 2-3 frases explicando a resposta correta com base no artigo
4. Siga o estilo CESPE (assertivo, direto, com pegadinhas baseadas em exceções)

Retorne APENAS JSON válido, sem texto fora do JSON:
{"questoes":[{"enunciado":"texto completo","alternativas":["A) ...","B) ...","C) ...","D) ...","E) ..."],"correta":"B","artigo":"Art. X da Lei/CF","justificativa":"explicação 2-3 frases","nivel":"facil"}]}`;

async function gerarClaude() {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4000,
    system: "Você é um especialista em questões de concurso público brasileiro. Retorne apenas JSON válido.",
    messages: [{ role: "user", content: PROMPT }],
  });
  return JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);
}

async function gerarGPT() {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4000,
    temperature: 0.9,
    messages: [
      { role: "system", content: "Você é um especialista em questões de concurso público brasileiro. Retorne apenas JSON válido." },
      { role: "user", content: PROMPT },
    ],
  });
  return JSON.parse((r.choices[0].message.content ?? "").match(/\{[\s\S]*\}/)[0]);
}

function exibir(modelo, questoes) {
  const nivelEmoji = { facil: "🟢 FÁCIL", medio: "🟡 MÉDIO", dificil: "🔴 DIFÍCIL" };
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${modelo}`);
  console.log(`${"═".repeat(70)}`);
  for (const q of questoes) {
    console.log(`\n${nivelEmoji[q.nivel] ?? q.nivel}`);
    console.log(`\n📝 ${q.enunciado}\n`);
    for (const alt of q.alternativas) console.log(`   ${alt}`);
    console.log(`\n✅ Gabarito: ${q.correta}`);
    console.log(`📖 Base legal: ${q.artigo}`);
    console.log(`💡 Justificativa: ${q.justificativa}`);
  }
}

console.log("🔄 Gerando questões com Claude Haiku e GPT-4o-mini...\n");
const [resultClaude, resultGPT] = await Promise.all([gerarClaude(), gerarGPT()]);

exibir("🤖 CLAUDE HAIKU 4.5", resultClaude.questoes);
exibir("💬 GPT-4o-mini", resultGPT.questoes);

console.log(`\n${"═".repeat(70)}`);
console.log("  Geração concluída — compare os resultados acima");
console.log(`${"═".repeat(70)}\n`);
