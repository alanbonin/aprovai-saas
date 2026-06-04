#!/usr/bin/env node
/**
 * corrigir-tudo-pendente.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Resolve TODAS as pendências de tópicos e questões:
 *  1. Cria tópicos para matérias que não têm nenhum
 *  2. Gera 100 questões para cada tópico sem questões
 *
 * Uso:
 *   node --env-file=.env scripts/corrigir-tudo-pendente.mjs
 *   node --env-file=.env scripts/corrigir-tudo-pendente.mjs --dry
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Env ───────────────────────────────────────────────────────────────────────
function loadEnvFile(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
const __dir = dirname(fileURLToPath(import.meta.url));
loadEnvFile(join(__dir, "../.env"));
loadEnvFile(join(__dir, "../.env.local"));

const isDry = process.argv.includes("--dry");

// ── Clientes ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const QUESTIONS_PER_TOPIC = 100;
const BATCH_SIZE = 10;
const MIN_TOPICS = 6;

// ── Tópicos pré-definidos para matérias sem tópicos ───────────────────────────
const TOPICOS_FIXOS = {
  "Controle Externo e TCU": [
    "Controle Externo — Conceito e Fundamentos Constitucionais",
    "Competências do TCU (art. 71 da CF/88)",
    "Auditoria Governamental — Tipos e Procedimentos",
    "Tomada e Prestação de Contas",
    "Sanções e Responsabilidades no Controle Externo",
    "Controle Interno e Externo — Diferenças e Integração",
  ],
  "História Mundial e Relações Internacionais": [
    "Primeira e Segunda Guerra Mundial",
    "Guerra Fria e Bipolaridade",
    "Descolonização da África e Ásia",
    "Globalização e Nova Ordem Mundial",
    "Organismos Internacionais (ONU, OTAN, FMI)",
    "Conflitos Contemporâneos e Geopolítica",
  ],
  "Direito Empresarial": [
    "Teoria da Empresa e Empresário Individual",
    "Tipos de Sociedades Empresariais (LTDA, SA, etc.)",
    "Títulos de Crédito (Cheque, NP, Duplicata, Letra de Câmbio)",
    "Falência e Recuperação Judicial (Lei 11.101/05)",
    "Contratos Empresariais",
    "Propriedade Intelectual — Marcas e Patentes",
  ],
  "Direito Internacional": [
    "Fontes e Sujeitos do Direito Internacional",
    "Tratados Internacionais — Convenção de Viena",
    "Organismos Internacionais (ONU, OEA, OMC)",
    "Direitos Humanos no Plano Internacional",
    "Responsabilidade Internacional do Estado",
    "Direito Internacional Humanitário",
  ],
  "Atualidades": [
    "Política Nacional e Conjuntura Brasileira",
    "Economia Brasileira e Internacional",
    "Relações Exteriores do Brasil",
    "Meio Ambiente e Sustentabilidade",
    "Ciência, Tecnologia e Inovação",
    "Questões Sociais e Direitos Humanos",
  ],
  "Gestão da Qualidade": [
    "Conceitos e Princípios da Qualidade Total (TQM)",
    "Normas ISO 9001 e Sistemas de Gestão",
    "Ferramentas da Qualidade (PDCA, 5S, Ishikawa, Pareto)",
    "Gestão por Processos e Mapeamento de Processos",
    "Indicadores de Desempenho e BSC",
    "Melhoria Contínua — Lean e Six Sigma",
  ],
  "Gestão de Pessoas": [
    "Recrutamento e Seleção de Pessoal",
    "Avaliação de Desempenho",
    "Treinamento e Desenvolvimento",
    "Cargos, Salários e Remuneração",
    "Motivação e Liderança nas Organizações",
    "Clima e Cultura Organizacional",
  ],
  "Ética e Estatuto da OAB": [
    "Ética Profissional do Advogado",
    "Estatuto da OAB (Lei 8.906/94)",
    "Código de Ética e Disciplina da OAB",
    "Sigilo Profissional e Impedimentos",
    "Responsabilidade Disciplinar do Advogado",
    "Ordem dos Advogados — Estrutura e Funcionamento",
  ],
  "LGPD e Conformidade Digital": [
    "Princípios e Bases Legais da LGPD (Lei 13.709/18)",
    "Direitos dos Titulares de Dados",
    "Controlador, Operador e Encarregado (DPO)",
    "ANPD — Autoridade Nacional de Proteção de Dados",
    "Segurança da Informação e Incidentes de Dados",
    "Sanções Administrativas e Responsabilidade Civil",
  ],
  "Redação Vestibular": [
    "Estrutura da Dissertação Argumentativa",
    "Competências do ENEM — Proposta de Intervenção",
    "Coesão e Coerência Textual",
    "Argumentação e Repertório Cultural",
    "Norma Culta e Adequação Linguística",
    "Análise e Interpretação de Textos de Apoio",
  ],
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function toSlug(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON não encontrado");
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
async function gerarTopicosIA(subjectName, categoria, qtd, existentes = []) {
  const avoidStr = existentes.length ? `\nNÃO repita: ${existentes.join(", ")}` : "";
  const prompt = `Liste exatamente ${qtd} tópicos essenciais para concursos públicos brasileiros da matéria "${subjectName}" (categoria: ${categoria}).${avoidStr}
Retorne APENAS JSON: {"topicos": ["Tópico 1", "Tópico 2", ...]}
Regras: concisos (3-8 palavras), distintos, cobrados em provas.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600, temperature: 0.5,
  });
  const parsed = JSON.parse(extractJSON(res.choices[0]?.message?.content ?? ""));
  return parsed.topicos ?? [];
}

// ── Gera questões para um tópico ─────────────────────────────────────────────
async function gerarQuestoes(topicId, topicName, subjectId, subjectName, categoria, target) {
  const BANCA_MAP = {
    "ambiental-agro": "CESPE/CEBRASPE", "bancario": "CESGRANRIO",
    "oab": "FGV", "revalida": "FUFMS/INEP", "cfc": "CFC",
    "vestibular": "FUVEST", "enem": "MEC/INEP", "militar": "ESPCEX",
    "diplomacia": "CESPE/CEBRASPE", "petrobras-estatais": "CESGRANRIO",
  };
  const banca = BANCA_MAP[categoria] ?? "CESPE/CEBRASPE";

  let total = 0;
  const recentStatements = [];

  while (total < target) {
    const qtd = Math.min(BATCH_SIZE, target - total);
    const avoidStr = recentStatements.length
      ? `\nNão repita questões similares a:\n${recentStatements.slice(-8).map(s => `- ${s.slice(0, 70)}`).join("\n")}`
      : "";

    const prompt = `Você é gerador de questões para concursos públicos brasileiros.
TÓPICO: ${topicName} | MATÉRIA: ${subjectName} | BANCA: ${banca}${avoidStr}

Gere EXATAMENTE ${qtd} questões múltipla escolha (A-E). 60% médio, 40% difícil.
Retorne APENAS JSON:
{"questoes":[{"enunciado":"texto","alternativas":["A) ...","B) ...","C) ...","D) ...","E) ..."],"correta":"B","artigo":"Art. X Lei Y","justificativa":"explicação sem mencionar letras","nivel":"medio"}]}`;

    let tentativa = 0;
    let sucesso = false;
    while (tentativa < 5 && !sucesso) {
      tentativa++;
      try {
        const res = await openai.chat.completions.create({
          model: "gpt-4o-mini", max_tokens: 8192, temperature: 0.9,
          messages: [
            { role: "system", content: "Gere questões de concurso. Retorne APENAS JSON válido." },
            { role: "user", content: prompt },
          ],
        });
        const raw = (res.choices[0].message.content ?? "").trim();
        const parsed = JSON.parse(extractJSON(raw));
        const questoes = (parsed.questoes ?? []).filter(q => q.enunciado?.trim().length > 10);
        if (questoes.length === 0) { sucesso = true; break; }

        const toInsert = questoes.map(q => {
          const opts = shuffleAndBuild(q.alternativas, q.correta);
          return { subjectId, topicId, banca, year: new Date().getFullYear(),
            level: q.nivel ?? "medio", statement: q.enunciado, ...opts,
            explanation: q.justificativa ?? null, artigo: q.artigo ?? null,
            source: "ia", aprovado: true };
        });

        if (!isDry) {
          const { data, error } = await db.from("Question").insert(toInsert).select("id");
          if (error) throw new Error(`DB: ${error.message}`);
          total += data?.length ?? 0;
        } else { total += toInsert.length; }

        recentStatements.push(...questoes.map(q => q.enunciado));
        process.stdout.write(`+${toInsert.length}`);
        sucesso = true;
        if (total < target) await new Promise(r => setTimeout(r, 1500)); // pausa entre batches

      } catch (err) {
        if ((err.message?.includes("429") || err.message?.includes("Rate limit")) && tentativa < 5) {
          const wait = tentativa * 30; // 30s, 60s, 90s, 120s
          process.stdout.write(` [429 — ${wait}s] `);
          await new Promise(r => setTimeout(r, wait * 1000));
        } else { process.stdout.write(` [err: ${err.message.slice(0, 35)}] `); break; }
      }
    }
    if (!sucesso) break;
  }
  return total;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔧 AprovAI360 — Corrigir TUDO Pendente");
  if (isDry) console.log("   🟡 DRY RUN\n");

  // Carrega dados com paginação (Supabase limita 1000 linhas por query)
  const { data: subjects } = await db.from("Subject").select("id, name, slug, categoria").order("categoria").order("name");

  // Pagina tópicos
  let topics = [];
  let topicFrom = 0;
  while (true) {
    const { data: batch } = await db.from("Topic").select("*").order("subjectId").order("ordem").range(topicFrom, topicFrom + 999);
    if (!batch?.length) break;
    topics = topics.concat(batch);
    if (batch.length < 1000) break;
    topicFrom += 1000;
  }

  const { data: questoesCounts } = await db.rpc("get_question_counts_by_topic");

  const qPorTopico = {};
  for (const row of (questoesCounts ?? [])) {
    if (row.topic_id) qPorTopico[row.topic_id] = Number(row.question_count);
  }

  const topicsBySubject = {};
  for (const t of topics ?? []) {
    if (!topicsBySubject[t.subjectId]) topicsBySubject[t.subjectId] = [];
    topicsBySubject[t.subjectId].push(t);
  }

  // Identifica problemas
  const subjectsSemTopicos = subjects.filter(s => !topicsBySubject[s.id]?.length);
  const topicosSemQ = (topics ?? []).filter(t => !qPorTopico[t.id]);

  console.log(`📊 Estado inicial (usando query do painel):`);
  console.log(`   Tópicos no banco:          ${topics.length}`);
  console.log(`   ❌ Matérias sem tópicos:   ${subjectsSemTopicos.length}`);
  console.log(`   ❌ Tópicos sem questões:   ${topicosSemQ.length}`);
  console.log(`   Questões a gerar (aprox):  ~${(subjectsSemTopicos.length * MIN_TOPICS + topicosSemQ.length) * QUESTIONS_PER_TOPIC}\n`);

  // ── FASE 1: Cria tópicos para matérias zeradas ────────────────────────────
  const topicosNovos = []; // acumula para gerar questões depois

  if (subjectsSemTopicos.length > 0) {
    console.log("═".repeat(60));
    console.log(`FASE 1 — Criar tópicos (${subjectsSemTopicos.length} matérias)`);
    console.log("═".repeat(60));

    for (const s of subjectsSemTopicos) {
      console.log(`\n📚 ${s.name} [${s.categoria}]`);

      let nomes = TOPICOS_FIXOS[s.name];
      if (!nomes) {
        process.stdout.write("   Gerando via IA...");
        try { nomes = await gerarTopicosIA(s.name, s.categoria, MIN_TOPICS); }
        catch (e) { console.log(` ❌ ${e.message}`); continue; }
      }
      console.log(`   ${nomes.length} tópicos:`);

      for (let i = 0; i < nomes.length; i++) {
        const nome = nomes[i];
        console.log(`   [${i+1}/${nomes.length}] ${nome}`);
        if (!isDry) {
          const { data: t, error } = await db.from("Topic").upsert({
            id: crypto.randomUUID(), name: nome, slug: toSlug(nome),
            subjectId: s.id, ordem: i + 1,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }, { onConflict: "subjectId,slug", ignoreDuplicates: true }).select("id, name, subjectId").maybeSingle();
          if (error) { console.log(`   ❌ ${error.message}`); continue; }
          if (t) topicosNovos.push({ ...t, subjectName: s.name, categoria: s.categoria });
          else console.log(`   ⚠️  já existe: ${nome}`);
        } else {
          topicosNovos.push({ id: `dry-${i}`, name: nome, subjectId: s.id, subjectName: s.name, categoria: s.categoria });
        }
      }
    }
  }

  // ── FASE 2: Gera questões para tópicos sem questões ────────────────────────
  const todosParaGerar = [
    ...topicosSemQ.map(t => {
      const subj = subjects.find(s => s.id === t.subjectId);
      return { id: t.id, name: t.name, subjectId: t.subjectId, subjectName: subj?.name ?? '?', categoria: subj?.categoria ?? 'geral' };
    }),
    ...topicosNovos,
  ];

  if (todosParaGerar.length > 0) {
    console.log("\n" + "═".repeat(60));
    console.log(`FASE 2 — Gerar questões (${todosParaGerar.length} tópicos × ${QUESTIONS_PER_TOPIC} questões)`);
    console.log("═".repeat(60));

    // Agrupa por matéria para exibição organizada
    const porMateria = {};
    for (const t of todosParaGerar) {
      if (!porMateria[t.subjectName]) porMateria[t.subjectName] = [];
      porMateria[t.subjectName].push(t);
    }

    let totalGerado = 0;
    let idx = 0;

    for (const [materia, topicos] of Object.entries(porMateria)) {
      console.log(`\n📚 ${materia} — ${topicos.length} tópico(s)`);
      for (const t of topicos) {
        idx++;
        process.stdout.write(`   [${idx}/${todosParaGerar.length}] ${t.name.slice(0, 44).padEnd(44)} `);
        const n = await gerarQuestoes(t.id, t.name, t.subjectId, t.subjectName, t.categoria, QUESTIONS_PER_TOPIC);
        totalGerado += n;
        console.log(` → ${n} questões`);
      }
    }

    console.log(`\n   Total questões geradas: ${totalGerado}`);
  }

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("✅ Concluído!");
  if (!isDry) {
    const { data: finalCounts } = await db.rpc("get_question_counts_by_topic");
    const semQ = (await db.from("Topic").select("id").range(0, 9999)).data
      ?.filter(t => !(finalCounts ?? []).find(r => r.topic_id === t.id && r.question_count > 0)) ?? [];
    const { count: totalQ } = await db.from("Question").select("*", { count: "exact", head: true });
    console.log(`   Total questões no banco: ${totalQ}`);
    console.log(`   Tópicos ainda sem questões: ${semQ.length}`);
  }
  console.log("═".repeat(60));
}

main().catch(err => { console.error("\n❌ Erro fatal:", err.message); process.exit(1); });
