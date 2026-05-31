#!/usr/bin/env node
/**
 * gerar-materiais-massa.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Gera apostilas PDF para cada tópico de cada matéria da biblioteca.
 *
 * - Usa Claude Sonnet para gerar o conteúdo
 * - Usa a API HTTP do próprio sistema (/api/admin/materiais/gerar) via admin token
 * - Processa uma matéria por vez (para aprovação manual entre elas)
 * - Salva progresso em .gerar-materiais-progress.json
 *
 * Uso:
 *   node --env-file=.env scripts/gerar-materiais-massa.mjs
 *   node --env-file=.env scripts/gerar-materiais-massa.mjs --subject "Língua Portuguesa"
 *   node --env-file=.env scripts/gerar-materiais-massa.mjs --reset
 *   node --env-file=.env scripts/gerar-materiais-massa.mjs --dry
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(__dirname, ".gerar-materiais-progress.json");

// ── Carrega .env manualmente (node --env-file falha com chaves longas) ────────
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
loadEnvFile(join(__dirname, "../.env"));
loadEnvFile(join(__dirname, "../.env.local"));

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY   = args.includes("--dry");
const RESET = args.includes("--reset");
const FILTER = (() => { const i = args.indexOf("--subject"); return i >= 0 ? args[i+1] : null; })();
const ONLY_SUBJECT = args.includes("--only-subject"); // gera só 1 tópico por matéria para teste

// ── Clientes ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Progresso ─────────────────────────────────────────────────────────────────
function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: {}, stats: { gerados: 0, erros: 0 } };
  try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")); }
  catch { return { done: {}, stats: { gerados: 0, erros: 0 } }; }
}
function saveProgress(p) { writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

// ── Extrai JSON ───────────────────────────────────────────────────────────────
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  try { return JSON.parse(text); } catch {}
  return null;
}

// ── Gera conteúdo com Claude ──────────────────────────────────────────────────
async function gerarConteudo(subjectName, topicName, categoria) {
  const isTI = ["ti","tecnologia-informacao"].includes(categoria) ||
    subjectName.toLowerCase().includes("banco de dados") ||
    subjectName.toLowerCase().includes("redes") ||
    subjectName.toLowerCase().includes("segurança") ||
    subjectName.toLowerCase().includes("algoritmo");

  const tipoInstrucao = isTI
    ? `Gere uma aula COMPLETA com 12-14 seções:
- 4 seções "teoria" numeradas (200 palavras cada)
- 2 "lista" de pontos-chave (10 itens cada)
- 2 "tabela" comparativas (4 colunas x 6 linhas)
- 2 "atencao" com pegadinhas
- 1 "codigo" com pseudocódigo ou exemplo real (max 15 linhas)
- 2 "exemplificando" com casos práticos
- 1 "destaque" final`
    : `Gere uma aula COMPLETA com 12-14 seções:
- 4-5 seções "teoria" numeradas (200 palavras cada, com 1.1, 1.2 dentro)
- 2 "lista" de pontos-chave (10 itens cada)
- 2 "tabela" comparativas com dados reais (4 colunas x 6 linhas)
- 2 "atencao" com pegadinhas e erros típicos
- 2 "exemplificando" com casos práticos do cargo
- 1 "destaque" final consolidando os pontos críticos`;

  const prompt = `Você é um professor especialista em ${subjectName} para concursos públicos brasileiros.
Gere uma Aula completa sobre: ${topicName || subjectName}

${tipoInstrucao}

TIPOS DE SEÇÃO (JSON):
- {"tipo":"teoria","titulo":"1. Titulo","texto":"..."} — 180-250 palavras, cite artigos de lei
- {"tipo":"lista","titulo":"...","itens":["..."]} — 8-10 itens, cada um até 25 palavras
- {"tipo":"tabela","titulo":"...","colunas":["A","B","C","D"],"linhas":[["v1","v2","v3","v4"]]} — 5-7 linhas
- {"tipo":"atencao","texto":"..."} — 60-90 palavras, pegadinha específica
- {"tipo":"exemplificando","titulo":"...","texto":"..."} — 100-140 palavras, situação real
- {"tipo":"codigo","titulo":"...","codigo":"..."} — só para TI, max 15 linhas
- {"tipo":"destaque","titulo":"...","texto":"..."} — 60-100 palavras

REGRAS:
- NUNCA duas "teoria" seguidas — intercale com exemplificando, atencao, lista ou tabela
- introducao: 2-3 frases conectando o tema com concursos (50-70 palavras)
- Linguagem técnica e didática como professor de cursinho
- Cite artigos de lei, prazos, valores e referências reais
- Último elemento deve ser "destaque" consolidando o essencial

Retorne APENAS JSON válido sem markdown:
{"titulo":"...","subtitulo":"...","cargo":"Concursos Públicos","materia":"${subjectName}","banca":"","numero_aula":"1","introducao":"...","secoes":[]}`;

  // Tenta até 3 vezes com response_format json_object para garantir JSON válido
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const msg = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 8000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é um professor especialista em concursos públicos brasileiros. Retorne APENAS JSON válido conforme o formato solicitado.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const raw = (msg.choices[0]?.message?.content ?? "").trim();
      const parsed = extractJSON(raw);
      if (parsed?.titulo && parsed?.secoes) return parsed;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

// ── Upload + registro ─────────────────────────────────────────────────────────
async function salvarMaterial(subjectId, subjectName, topicId, topicName, content) {
  if (DRY) {
    console.log(`    [DRY] Geraria: "${content.titulo}"`);
    return null;
  }

  // Verifica se já existe material para esse tópico
  const { data: existing } = await db
    .from("Material")
    .select("id")
    .eq("subjectId", subjectId)
    .ilike("title", `%${topicName.slice(0, 30)}%`)
    .limit(1);

  if (existing?.length > 0) {
    console.log(`    ⏭️  Já existe material para "${topicName}"`);
    return "exists";
  }

  // Gera PDF via API interna (usa o mesmo componente do admin)
  // Como estamos em script, chamamos a rota HTTP local se o servidor estiver rodando
  // Caso contrário, salvamos apenas os metadados (sem PDF por enquanto)
  // e registramos para geração posterior via admin panel

  const title = `${content.titulo}`.slice(0, 120);
  const description = `Aula gerada por IA. ${content.secoes?.length ?? 0} seções. Tópico: ${topicName}`;

  // Registra metadados no banco (sem arquivo ainda — geração de PDF via painel)
  const { data: material, error } = await db.from("Material").insert({
    id: crypto.randomUUID(),
    title,
    description,
    type: "PDF",
    subjectId,
    topicId: topicId || null,
    banca: null,
    fileUrl: null, // será preenchido após geração via admin panel
    fileSize: null,
    isPremium: false,
    active: false, // inativo até ter o PDF gerado
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Armazena conteúdo para geração posterior
    content: JSON.stringify(content),
  }).select().single();

  if (error) {
    // Tenta sem o campo content (pode não existir na tabela)
    const { data: mat2, error: err2 } = await db.from("Material").insert({
      id: crypto.randomUUID(),
      title,
      description,
      type: "PDF",
      subjectId,
      banca: null,
      fileUrl: null,
      fileSize: null,
      isPremium: false,
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).select().single();

    if (err2) throw new Error(`DB insert: ${err2.message}`);
    return mat2;
  }

  return material;
}

// ── Processa uma matéria ──────────────────────────────────────────────────────
async function processarMateria(subject, topicos, progress) {
  console.log(`\n📚 ${subject.name}`);
  console.log(`   ${topicos.length} tópicos para gerar`);

  let gerados = 0;

  const topicosParaGerar = ONLY_SUBJECT ? topicos.slice(0, 1) : topicos;

  for (const [i, topico] of topicosParaGerar.entries()) {
    const key = `${subject.id}:${topico.id}`;
    if (progress.done[key]) {
      console.log(`   ⏭️  [${i+1}/${topicosParaGerar.length}] ${topico.name} — já gerado`);
      continue;
    }

    process.stdout.write(`   📝 [${i+1}/${topicosParaGerar.length}] ${topico.name}... `);

    try {
      const content = await gerarConteudo(subject.name, topico.name, subject.categoria);
      if (!content) throw new Error("Conteúdo inválido");

      const result = await salvarMaterial(subject.id, subject.name, topico.id, topico.name, content);

      if (result === "exists") {
        progress.done[key] = true;
      } else {
        progress.done[key] = true;
        progress.stats.gerados++;
        gerados++;
        console.log(`✅ "${content.titulo.slice(0, 50)}"`);
      }

      saveProgress(progress);
      await new Promise(r => setTimeout(r, 500)); // rate limiting
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
      progress.stats.erros++;
      saveProgress(progress);
    }
  }

  return gerados;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("📖 Gerador de Materiais — AprovAI360\n");

  if (RESET && existsSync(PROGRESS_FILE)) {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(PROGRESS_FILE);
    console.log("🗑️  Progresso resetado\n");
  }

  const progress = loadProgress();
  if (DRY) console.log("🟡 MODO DRY — nenhum material será criado\n");

  // Ordem de prioridade
  const PRIORIDADE = ["geral","direito","policial","fiscal","bancario","gestao","ti","previdencia-social","controle-auditoria","militar","judicial","gestao-publica","ministerio-publico","diplomacia","ambiental-agro","petrobras-estatais","banco-central","bancos-publicos","cfc","enem","oab","vestibular","revalida","tecnologia-informacao"];

  let subjectsQuery = db.from("Subject").select("id, name, categoria").order("name");
  if (FILTER) subjectsQuery = subjectsQuery.ilike("name", `%${FILTER}%`);
  const { data: subjects } = await subjectsQuery;

  const ordered = (subjects ?? []).sort((a, b) => {
    const pa = PRIORIDADE.indexOf(a.categoria);
    const pb = PRIORIDADE.indexOf(b.categoria);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb) || a.name.localeCompare(b.name);
  });

  // Busca todos os tópicos de uma vez
  const { data: allTopics } = await db.from("Topic").select("id, name, subjectId, ordem").order("ordem");
  const topicsPorMateria = {};
  for (const t of allTopics ?? []) {
    if (!topicsPorMateria[t.subjectId]) topicsPorMateria[t.subjectId] = [];
    topicsPorMateria[t.subjectId].push(t);
  }

  const materiasComTopicos = ordered.filter(s => (topicsPorMateria[s.id]?.length ?? 0) > 0);
  console.log(`📋 ${materiasComTopicos.length} matérias com tópicos para gerar`);
  console.log(`   Já concluídos: ${Object.keys(progress.done).length} tópicos\n`);

  let totalGerados = 0;
  for (const subject of materiasComTopicos) {
    const topicos = topicsPorMateria[subject.id] ?? [];
    const gerados = await processarMateria(subject, topicos, progress);
    totalGerados += gerados;

    // Pausa entre matérias
    if (!DRY) await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅ Concluído!");
  console.log(`   Materiais gerados: ${progress.stats.gerados.toLocaleString("pt-BR")}`);
  console.log(`   Erros:             ${progress.stats.erros}`);
  console.log("═".repeat(60));
  console.log("\n⚠️  Os materiais foram registrados como inativos (active: false).");
  console.log("   Acesse /admin/materiais para gerar os PDFs e ativar cada um.");
}

main().catch(err => {
  console.error("\n❌ Erro fatal:", err.message);
  process.exit(1);
});
