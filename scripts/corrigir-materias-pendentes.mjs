#!/usr/bin/env node
/**
 * corrigir-materias-pendentes.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Corrige as 8 matérias pendentes:
 *  - 2 sem tópicos → cria tópicos + gera 100 questões por tópico
 *  - 6 com tópicos mas sem questões → verifica se precisa mais tópicos e gera 100 questões
 *
 * Uso:
 *   node --env-file=.env scripts/corrigir-materias-pendentes.mjs
 *   node --env-file=.env scripts/corrigir-materias-pendentes.mjs --dry
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Env ───────────────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eqIdx = t.indexOf("=");
    if (eqIdx < 0) continue;
    const key = t.slice(0, eqIdx).trim();
    let val = t.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
const __dir = dirname(fileURLToPath(import.meta.url));
loadEnvFile(join(__dir, "../.env"));
loadEnvFile(join(__dir, "../.env.local"));

const isDry = process.argv.includes("--dry");

// ── Clientes ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QUESTIONS_PER_TOPIC = 100;
const BATCH_SIZE = 10;
const MIN_TOPICS = 5; // mínimo de tópicos por matéria

// ── Tópicos recomendados para matérias sem tópicos ────────────────────────────
const TOPICOS_SUGERIDOS = {
  "Agroquímica e Defensivos Agrícolas": [
    "Classificação e Tipos de Defensivos Agrícolas",
    "Mecanismos de Ação dos Agrotóxicos",
    "Resistência de Pragas e Manejo Integrado",
    "Legislação sobre Defensivos Agrícolas (Lei 7.802/89)",
    "Boas Práticas no Uso de Agrotóxicos",
    "Impactos Ambientais e Toxicologia",
    "Fertilizantes e Corretivos de Solo",
  ],
  "Fiscalização Ambiental e Licenciamento": [
    "Licenciamento Ambiental — Conceito e Fases",
    "EIA/RIMA — Estudo e Relatório de Impacto Ambiental",
    "Poder de Polícia e Fiscalização do IBAMA",
    "Infrações e Sanções Administrativas Ambientais (Lei 9.605/98)",
    "Competências dos Órgãos do SISNAMA",
    "Licença Prévia, de Instalação e de Operação",
    "Responsabilidade Administrativa, Civil e Penal Ambiental",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON não encontrado na resposta");
  return match[0];
}

function shuffleAndBuild(alternativas, correta) {
  const map = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const correctText = alternativas[map[correta]];
  const shuffled = [...alternativas].sort(() => Math.random() - 0.5);
  const newIdx = shuffled.findIndex(a => a === correctText);
  const letters = ["A", "B", "C", "D", "E"];
  return {
    optionA: shuffled[0]?.replace(/^[A-E]\)\s*/, "") ?? "",
    optionB: shuffled[1]?.replace(/^[A-E]\)\s*/, "") ?? "",
    optionC: shuffled[2]?.replace(/^[A-E]\)\s*/, "") ?? "",
    optionD: shuffled[3]?.replace(/^[A-E]\)\s*/, "") ?? "",
    optionE: shuffled[4]?.replace(/^[A-E]\)\s*/, "") ?? "",
    answer: letters[newIdx] ?? "A",
  };
}

// ── Gera tópicos via IA ───────────────────────────────────────────────────────
async function gerarTopicos(subjectName, categoria, qtd = MIN_TOPICS) {
  const prompt = `Liste exatamente ${qtd} tópicos essenciais para estudo da matéria "${subjectName}"
em concursos públicos brasileiros na área ${categoria}.

Retorne APENAS JSON válido:
{"topicos": ["Tópico 1", "Tópico 2", ...]}

Regras:
- Tópicos concisos (3-8 palavras)
- Cobertos frequentemente em provas
- Distintos entre si`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.5,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(extractJSON(raw));
  return parsed.topicos ?? [];
}

// ── Gera questões para um tópico ─────────────────────────────────────────────
async function gerarQuestoesParaTopico(topicId, topicName, subjectId, subjectName, categoria, totalTarget) {
  const BANCA_MAP = {
    "ambiental-agro": "CESPE/CEBRASPE",
    "bancario": "CESGRANRIO",
  };
  const banca = BANCA_MAP[categoria] || "CESPE/CEBRASPE";

  let totalInserido = 0;
  let recentStatements = [];

  while (totalInserido < totalTarget) {
    const remaining = totalTarget - totalInserido;
    const batchQtd = Math.min(BATCH_SIZE, remaining);

    const avoidStr = recentStatements.length > 0
      ? `\n\nNÃO repita questões similares a estas já geradas:\n${recentStatements.slice(-10).map(s => `- ${s.slice(0, 80)}`).join("\n")}`
      : "";

    const prompt = `Você é um gerador especializado de questões para concursos públicos brasileiros.

TÓPICO: ${topicName}
MATÉRIA: ${subjectName}
BANCA: ${banca}${avoidStr}

Gere EXATAMENTE ${batchQtd} questões de múltipla escolha (A-E). Nível: 60% médio, 40% difícil.

Retorne APENAS JSON válido:
{"questoes":[{"enunciado":"texto","alternativas":["A) texto","B) texto","C) texto","D) texto","E) texto"],"correta":"B","artigo":"Art. X da Lei Y","justificativa":"explicação sem mencionar letras","nivel":"medio"}]}`;

    let tentativa = 0;
    const MAX_TENTATIVAS = 5;
    let sucesso = false;

    while (tentativa < MAX_TENTATIVAS && !sucesso) {
      tentativa++;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 8192,
          temperature: 0.9,
          messages: [
            { role: "system", content: "Gere questões de concurso. Retorne APENAS JSON válido." },
            { role: "user", content: prompt },
          ],
        });

        const raw = (completion.choices[0].message.content ?? "").trim();
        const parsed = JSON.parse(extractJSON(raw));
        const questoes = (parsed.questoes ?? []).filter(q => q.enunciado?.trim().length > 10);

        if (questoes.length === 0) { process.stdout.write("(vazio)"); sucesso = true; break; }

        const toInsert = questoes.map(q => {
          const { optionA, optionB, optionC, optionD, optionE, answer } = shuffleAndBuild(q.alternativas, q.correta);
          return {
            subjectId, topicId, banca,
            year: new Date().getFullYear(),
            level: q.nivel ?? "medio",
            statement: q.enunciado,
            optionA, optionB, optionC, optionD, optionE, answer,
            explanation: q.justificativa ?? null,
            artigo: q.artigo ?? null,
            source: "ia",
            aprovado: true,
          };
        });

        if (!isDry) {
          const { data, error } = await db.from("Question").insert(toInsert).select("id");
          if (error) throw new Error(`DB: ${error.message}`);
          totalInserido += data?.length ?? 0;
        } else {
          totalInserido += toInsert.length;
        }

        recentStatements.push(...questoes.map(q => q.enunciado));
        process.stdout.write(`+${toInsert.length}`);
        sucesso = true;

        if (totalInserido < totalTarget) await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        const is429 = err.message?.includes("429") || err.message?.includes("Rate limit");
        if (is429 && tentativa < MAX_TENTATIVAS) {
          const espera = tentativa * 20; // 20s, 40s, 60s...
          process.stdout.write(` [rate limit — aguardando ${espera}s] `);
          await new Promise(r => setTimeout(r, espera * 1000));
        } else {
          process.stdout.write(` [erro: ${err.message.slice(0, 40)}] `);
          break;
        }
      }
    }
  }

  return totalInserido;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔧 AprovAI360 — Corrigir Matérias Pendentes");
  if (isDry) console.log("   🟡 DRY RUN — nada será inserido\n");

  // 1. Identifica matérias com problema
  const { data: subjects } = await db.from("Subject").select("id, name, categoria").order("name");
  const { data: topics } = await db.from("Topic").select("id, name, subjectId, ordem");

  const topicsBySubject = {};
  for (const t of topics ?? []) {
    if (!topicsBySubject[t.subjectId]) topicsBySubject[t.subjectId] = [];
    topicsBySubject[t.subjectId].push(t);
  }

  const semTopicos = [];
  const comTopicosSemQ = [];

  for (const s of subjects ?? []) {
    const topicList = topicsBySubject[s.id] ?? [];
    if (topicList.length === 0) { semTopicos.push(s); continue; }
    const { count } = await db.from("Question").select("*", { count: "exact", head: true }).eq("subjectId", s.id);
    if ((count ?? 0) === 0) comTopicosSemQ.push({ ...s, topicos: topicList });
  }

  console.log(`📋 Matérias sem tópicos:              ${semTopicos.length}`);
  console.log(`📋 Matérias com tópicos sem questões: ${comTopicosSemQ.length}`);
  console.log(`📋 Total a corrigir:                  ${semTopicos.length + comTopicosSemQ.length}\n`);

  // ── FASE 1: Matérias sem tópicos ───────────────────────────────────────────
  if (semTopicos.length > 0) {
    console.log("═".repeat(60));
    console.log("FASE 1 — Criar tópicos para matérias zeradas");
    console.log("═".repeat(60));

    for (const s of semTopicos) {
      console.log(`\n📚 ${s.name} [${s.categoria}]`);

      // Usa tópicos pré-definidos se disponível, senão gera via IA
      let topicNames = TOPICOS_SUGERIDOS[s.name];
      if (!topicNames) {
        process.stdout.write("   Gerando tópicos via IA...");
        topicNames = await gerarTopicos(s.name, s.categoria, MIN_TOPICS);
        console.log(` ${topicNames.length} tópicos criados`);
      } else {
        console.log(`   Usando ${topicNames.length} tópicos pré-definidos`);
      }

      // Insere tópicos no banco
      const novosTopicos = [];
      for (let i = 0; i < topicNames.length; i++) {
        const nome = topicNames[i];
        console.log(`   [${i+1}/${topicNames.length}] ${nome}`);

        if (!isDry) {
          const { data: newTopic, error } = await db.from("Topic").insert({
            id: crypto.randomUUID(),
            name: nome,
            slug: toSlug(nome),
            subjectId: s.id,
            ordem: i + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).select("id, name").single();

          if (error) { console.log(`   ❌ Erro ao criar tópico: ${error.message}`); continue; }
          novosTopicos.push(newTopic);
        } else {
          novosTopicos.push({ id: `dry-${i}`, name: nome });
        }
      }

      // Gera questões para cada tópico criado
      console.log(`\n   Gerando ${QUESTIONS_PER_TOPIC} questões por tópico...`);
      for (const t of novosTopicos) {
        process.stdout.write(`   📝 ${t.name.slice(0, 45).padEnd(45)} `);
        const inserted = await gerarQuestoesParaTopico(t.id, t.name, s.id, s.name, s.categoria, QUESTIONS_PER_TOPIC);
        console.log(` → ${inserted} questões`);
      }
    }
  }

  // ── FASE 2: Matérias com tópicos mas sem questões ──────────────────────────
  if (comTopicosSemQ.length > 0) {
    console.log("\n" + "═".repeat(60));
    console.log("FASE 2 — Gerar questões para matérias com tópicos");
    console.log("═".repeat(60));

    for (const s of comTopicosSemQ) {
      console.log(`\n📚 ${s.name} [${s.categoria}] — ${s.topicos.length} tópico(s)`);

      // Verifica se precisa de mais tópicos (mínimo MIN_TOPICS)
      if (s.topicos.length < MIN_TOPICS) {
        const faltam = MIN_TOPICS - s.topicos.length;
        console.log(`   ⚠️  Apenas ${s.topicos.length} tópico(s) — gerando +${faltam} via IA...`);

        const nomesExistentes = s.topicos.map(t => t.name);
        const prompt = `A matéria "${s.name}" já tem estes tópicos: ${nomesExistentes.join(", ")}.
Sugira mais ${faltam} tópicos DIFERENTES e complementares para concursos públicos.
Retorne APENAS JSON: {"topicos": ["Tópico 1", ...]}`;

        try {
          const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.5,
          });
          const parsed = JSON.parse(extractJSON(res.choices[0].message.content ?? ""));
          const novosNomes = (parsed.topicos ?? []).slice(0, faltam);

          for (let i = 0; i < novosNomes.length; i++) {
            const nome = novosNomes[i];
            console.log(`   + ${nome}`);
            if (!isDry) {
              const maxOrdem = Math.max(...s.topicos.map(t => t.ordem ?? 0));
              const { data: newT, error } = await db.from("Topic").insert({
                id: crypto.randomUUID(),
                name: nome,
                slug: toSlug(nome),
                subjectId: s.id,
                ordem: maxOrdem + i + 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }).select("id, name").single();
              if (!error && newT) s.topicos.push(newT);
            } else {
              s.topicos.push({ id: `dry-new-${i}`, name: nome });
            }
          }
        } catch (err) {
          console.log(`   ❌ Erro ao gerar tópicos extras: ${err.message}`);
        }
      }

      // Gera questões para todos os tópicos
      console.log(`   Gerando ${QUESTIONS_PER_TOPIC} questões × ${s.topicos.length} tópicos...`);
      let totalMateria = 0;
      for (const t of s.topicos) {
        process.stdout.write(`   📝 ${t.name.slice(0, 45).padEnd(45)} `);
        const inserted = await gerarQuestoesParaTopico(t.id, t.name, s.id, s.name, s.categoria, QUESTIONS_PER_TOPIC);
        totalMateria += inserted;
        console.log(` → ${inserted} questões`);
      }
      console.log(`   ✅ Total ${s.name}: ${totalMateria} questões`);
    }
  }

  // ── Resumo final ───────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("✅ Concluído!");

  if (!isDry) {
    const { count: totalQ } = await db.from("Question").select("*", { count: "exact", head: true });
    const { count: totalT } = await db.from("Topic").select("*", { count: "exact", head: true });
    console.log(`   Total tópicos no banco: ${totalT}`);
    console.log(`   Total questões no banco: ${totalQ}`);
  }
  console.log("═".repeat(60));
}

main().catch(err => {
  console.error("\n❌ Erro fatal:", err.message);
  process.exit(1);
});
