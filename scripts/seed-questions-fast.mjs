/**
 * seed-questions-fast.mjs — Seed acelerado de questões por matérias prioritárias
 *
 * Estratégia:
 * - 15 matérias mais transversais (aparecem em quase todos os concursos)
 * - 3 bancas por matéria (CESPE, FCC, FGV)
 * - 10 questões por banca = 30 por matéria = ~450 questões novas
 *
 * Uso: node scripts/seed-questions-fast.mjs
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

// ── Carrega .env e .env.local ─────────────────────────────────────────────────
function loadEnv(file) {
  try {
    const lines = readFileSync(file, "utf8").split("\n");
    for (const line of lines) {
      const eq = line.indexOf("=");
      if (eq < 1 || line.trim().startsWith("#")) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(".env");
loadEnv(".env.local");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error("❌ Variáveis de ambiente obrigatórias não configuradas.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const ai = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── Matérias prioritárias (slug parcial para match) ───────────────────────────
const PRIORITY_SUBJECTS = [
  "Língua Portuguesa",
  "Raciocínio Lógico",
  "Direito Administrativo",
  "Direito Constitucional",
  "Direito Penal",
  "Direito Processual",
  "Administração Pública",
  "Contabilidade",
  "Economia",
  "Finanças Públicas",
  "Direito Tributário",
  "Direito Civil",
  "Legislação",
  "Informática",
  "Matemática",
];

const BANCAS = [
  {
    name: "CESPE/CEBRASPE",
    perfil: "CESPE CERTO/ERRADO: optionA='CERTO', optionB='ERRADO', sem C/D/E. answer='A' se certo, 'B' se errado. Varie 50/50.",
    cespe: true,
  },
  {
    name: "FCC",
    perfil: "FCC múltipla escolha 5 alternativas (A-E). Foco em texto literal de lei. Objetiva e direta.",
    cespe: false,
  },
  {
    name: "FGV",
    perfil: "FGV múltipla escolha 5 alternativas (A-E). Casos práticos, situações-problema, raciocínio aplicado.",
    cespe: false,
  },
];

const QTD = 10; // questões por matéria por banca

async function gerarQuestoes(subject, banca, qtd) {
  const prompt = `Gere ${qtd} questões de concurso público para "${subject.name}" no estilo ${banca.name}.

PERFIL: ${banca.perfil}

${banca.cespe ? `CESPE: optionA='CERTO', optionB='ERRADO', optionC=null, optionD=null, optionE=null. answer='A' ou 'B'.` : `5 alternativas reais (A-E), 1 correta.`}

REGRAS:
- Varie dificuldade: 30% fácil, 50% médio, 20% difícil
- Baseie nas cobranças reais de concursos para ${subject.name}
- Explicações completas e didáticas
- Distratores plausíveis

RETORNE APENAS JSON array (${qtd} objetos):
[{"statement":"...","optionA":"...","optionB":"...","optionC":null,"optionD":null,"optionE":null,"answer":"A","explanation":"...","level":"medio"}]`;

  const resp = await ai.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "[]";
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error("JSON inválido");
  return JSON.parse(match[0]);
}

async function main() {
  console.log("🎓 AprovAI360 — Seed de Questões (Rápido)");

  // Busca todas as matérias
  const { data: allSubjects } = await db.from("Subject").select("id,name").order("ordem");
  if (!allSubjects?.length) { console.error("❌ Nenhuma matéria no banco. Rode seed-subjects primeiro."); process.exit(1); }

  // Filtra pelas prioritárias (match parcial no nome)
  const subjects = allSubjects.filter(s =>
    PRIORITY_SUBJECTS.some(p => s.name.toLowerCase().includes(p.toLowerCase()))
  );

  // Remove duplicatas de nome (pega só a primeira ocorrência de cada nome)
  const seen = new Set();
  const uniqueSubjects = subjects.filter(s => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`📋 ${uniqueSubjects.length} matérias prioritárias encontradas`);
  console.log(`🎯 Meta: ~${uniqueSubjects.length * BANCAS.length * QTD} questões novas\n`);

  let total = 0;
  let erros = 0;

  for (const subject of uniqueSubjects) {
    for (const banca of BANCAS) {
      process.stdout.write(`  📝 ${subject.name.slice(0,30).padEnd(32)} · ${banca.name.padEnd(16)} ... `);

      try {
        const questoes = await gerarQuestoes(subject, banca, QTD);

        const rows = questoes.map(q => ({
          subjectId: subject.id,
          banca: banca.name,
          level: q.level ?? "medio",
          statement: q.statement,
          optionA: q.optionA ?? null,
          optionB: q.optionB ?? null,
          optionC: q.optionC ?? null,
          optionD: q.optionD ?? null,
          optionE: q.optionE ?? null,
          answer: q.answer,
          explanation: q.explanation ?? null,
          source: "ia",
        }));

        const { error } = await db.from("Question").insert(rows);
        if (error) throw new Error(error.message);

        console.log(`✅ ${rows.length}`);
        total += rows.length;

        // Rate limit — evita throttling da API
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        erros++;
        console.log(`❌ ${e.message.slice(0, 60)}`);
      }
    }
  }

  const { count } = await db.from("Question").select("*", { count: "exact", head: true });

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ ${total} questões inseridas | ❌ ${erros} erros`);
  console.log(`📊 Total no banco agora: ${count} questões`);
  console.log(`${"─".repeat(60)}`);
}

main().catch(console.error);
