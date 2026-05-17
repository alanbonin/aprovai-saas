// Script para gerar questões para as matérias do Zeus via Anthropic
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Carrega .env e .env.local
for (const file of [".env", ".env.local"]) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MATERIAS = [
  { id: "cc21e3c5-d64a-43e1-b667-fdc9ccfe9acb", name: "Legislação Policial", count: 15 },
  { id: "05aa7c2f-869c-4ca1-8ceb-afd0b49169b2", name: "Direito Penal", count: 15 },
  { id: "0dfe2a7b-c990-44bf-a235-6a9d93671a88", name: "Direito Processual Penal", count: 10 },
  { id: "ab1e7997-db7e-499e-8e0c-d0fb3f8a0596", name: "Direito Constitucional", count: 10 },
  { id: "5dfda86b-8b22-4b7c-ba89-7c8fc49afb6a", name: "Língua Portuguesa", count: 8 },
  { id: "cd0f8d03-0963-4c68-aaaa-d95e11582c1a", name: "Raciocínio Lógico", count: 8 },
  { id: "8828412d-df1a-400e-ab0e-79a44a32b659", name: "Criminologia", count: 8 },
  { id: "6cab0e88-abd7-4b85-a209-a2625403ea0a", name: "Medicina Legal", count: 8 },
  { id: "75e636bd-00f6-4c5a-a843-2079582bba72", name: "Informática", count: 6 },
];

function extractJSON(text) {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("Nenhum array JSON encontrado");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("JSON incompleto");
}

async function gerarQuestoes(materia) {
  console.log(`\n📝 Gerando ${materia.count} questões para: ${materia.name}...`);

  const prompt = `Gere ${materia.count} questões de múltipla escolha de nível concurso público sobre "${materia.name}" para a banca AOCP, estilo Polícia Civil.

Cada questão deve ter:
- statement: enunciado completo e técnico (mínimo 2 frases)
- optionA, optionB, optionC, optionD, optionE: 5 alternativas
- answer: letra correta (A, B, C, D ou E)
- explanation: explicação detalhada da resposta
- level: "facil", "medio" ou "dificil"
- artigo: artigo de lei relacionado (ex: "Art. 302 do CPP")

Responda APENAS com um array JSON válido, sem nenhum texto antes ou depois:
[
  {
    "statement": "...",
    "optionA": "...",
    "optionB": "...",
    "optionC": "...",
    "optionD": "...",
    "optionE": "...",
    "answer": "A",
    "explanation": "...",
    "level": "medio",
    "artigo": "Art. X da Lei Y"
  }
]`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const questoesJSON = extractJSON(text);
  const questoes = JSON.parse(questoesJSON);

  let inseridas = 0;
  for (const q of questoes) {
    const { error } = await db.from("Question").insert({
      subjectId: materia.id,
      statement: q.statement,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      optionE: q.optionE,
      answer: q.answer,
      explanation: q.explanation,
      level: q.level || "medio",
      artigo: q.artigo || null,
      dicaBanca: null,
      banca: "AOCP",
      year: 2024,
    });
    if (error) console.error("  ❌ Erro ao inserir:", error.message);
    else inseridas++;
  }

  console.log(`  ✅ ${inseridas}/${questoes.length} questões inseridas para ${materia.name}`);
  return inseridas;
}

async function main() {
  console.log("🚀 Iniciando geração de questões...\n");
  let total = 0;

  for (const materia of MATERIAS) {
    try {
      const n = await gerarQuestoes(materia);
      total += n;
      // Aguarda 2s entre chamadas para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`❌ Erro em ${materia.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Concluído! Total de questões geradas: ${total}`);
}

main();
