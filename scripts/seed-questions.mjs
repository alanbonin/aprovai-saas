/**
 * seed-questions.mjs — Popula o banco de questões com IA
 *
 * Gera questões realistas de concursos para cada matéria cadastrada no sistema.
 * Usa Claude para gerar questões no estilo das principais bancas.
 *
 * Uso:
 *   node scripts/seed-questions.mjs
 *   node scripts/seed-questions.mjs --subject "Direito Administrativo" --qtd 30
 *   node scripts/seed-questions.mjs --banca CESPE --qtd 20
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

// ── Env ───────────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const lines = readFileSync(".env.local", "utf8").split("\n");
    for (const line of lines) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env.local");
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error("❌ ANTHROPIC_API_KEY é obrigatório no .env.local");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── Args CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const FILTER_SUBJECT = getArg("--subject");
const FILTER_BANCA = getArg("--banca") ?? "misto";
const QTD_PER_SUBJECT = parseInt(getArg("--qtd") ?? "20");

// ── Bancas e distribuição ──────────────────────────────────────────────────────
const BANCAS = ["CESPE/CEBRASPE", "FCC", "FGV", "VUNESP", "IBFC"];

const BANCA_PERFIS = {
  "CESPE/CEBRASPE": "Questões CERTO/ERRADO. optionA='CERTO', optionB='ERRADO', optionC=null, optionD=null, optionE=null. Enunciados longos com afirmações a julgar.",
  "FCC": "Múltipla escolha com 5 alternativas (A-E). Foco em texto literal de lei. Direto e objetivo.",
  "FGV": "Múltipla escolha com 5 alternativas (A-E). Casos práticos, situações-problema, raciocínio aplicado.",
  "VUNESP": "Múltipla escolha com 5 alternativas (A-E). Legislação estadual e federal, nível médio-alto.",
  "IBFC": "Múltipla escolha com 5 alternativas (A-E). Nível médio, conceitos fundamentais, regra geral.",
};

// ── Gera questões via Claude ──────────────────────────────────────────────────
async function gerarQuestoes(subject, banca, qtd) {
  const bancaInfo = BANCA_PERFIS[banca] ?? BANCA_PERFIS["FCC"];
  const isCespe = banca.includes("CESPE");

  const prompt = `Gere ${qtd} questões de concurso público para a disciplina "${subject.name}" no estilo da banca ${banca}.

PERFIL DA BANCA: ${bancaInfo}

${isCespe ? `FORMATO CESPE OBRIGATÓRIO:
- optionA: "CERTO"
- optionB: "ERRADO"
- optionC: null, optionD: null, optionE: null
- answer: "A" (se afirmação é certa) ou "B" (se errada)
- Varie: ~50% certas, ~50% erradas` : `FORMATO MÚLTIPLA ESCOLHA:
- 5 alternativas (A, B, C, D, E)
- 1 resposta correta, 4 distratores plausíveis`}

INSTRUÇÕES:
- Varie a dificuldade: 30% fácil, 50% médio, 20% difícil
- Baseie nas principais cobranças de concursos reais para ${subject.name}
- Explicações didáticas e precisas
- Distratores plausíveis mas claramente errados para quem sabe

RETORNE APENAS este JSON (array de ${qtd} objetos):
[
  {
    "statement": "Enunciado completo",
    "optionA": "Alternativa A",
    "optionB": "Alternativa B",
    "optionC": "Alternativa C ou null",
    "optionD": "Alternativa D ou null",
    "optionE": "Alternativa E ou null",
    "answer": "A",
    "explanation": "Explicação detalhada",
    "level": "facil|medio|dificil"
  }
]`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON inválido na resposta");
  return JSON.parse(match[0]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🎓 Aprovai — Seed de Questões");
  console.log(`📋 Configuração: ${QTD_PER_SUBJECT} questões por matéria | Banca: ${FILTER_BANCA}\n`);

  // Busca matérias
  let query = db.from("Subject").select("id, name, slug").order("ordem");
  if (FILTER_SUBJECT) query = query.ilike("name", `%${FILTER_SUBJECT}%`);
  const { data: subjects, error } = await query;

  if (error || !subjects?.length) {
    console.error("❌ Erro ao buscar matérias:", error?.message ?? "Nenhuma encontrada");
    process.exit(1);
  }

  console.log(`✅ ${subjects.length} matéria(s) encontrada(s)\n`);

  let totalInserted = 0;

  for (const subject of subjects) {
    const bancasParaGerar = FILTER_BANCA === "misto" ? BANCAS : [FILTER_BANCA];
    const qtdPorBanca = Math.ceil(QTD_PER_SUBJECT / bancasParaGerar.length);

    for (const banca of bancasParaGerar) {
      process.stdout.write(`  📝 ${subject.name} · ${banca} (${qtdPorBanca} questões)... `);

      try {
        const questoes = await gerarQuestoes(subject, banca, qtdPorBanca);

        const rows = questoes.map(q => ({
          subjectId: subject.id,
          banca,
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

        const { error: insertError } = await db.from("Question").insert(rows);
        if (insertError) throw new Error(insertError.message);

        console.log(`✅ ${rows.length} inseridas`);
        totalInserted += rows.length;

        // Rate limit entre chamadas (evita throttling)
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        console.log(`❌ Erro: ${e.message}`);
      }
    }
  }

  console.log(`\n🏁 Concluído! ${totalInserted} questões inseridas no banco.`);
  console.log(`\nDica: execute novamente com --subject "Matéria" para focar em uma disciplina.`);
}

main().catch(console.error);
