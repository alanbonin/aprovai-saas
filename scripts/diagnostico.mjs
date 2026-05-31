#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("🔍 Diagnóstico do banco...\n");

  // 1. Questões sem tópico
  const { count: semTopico } = await db
    .from("Question")
    .select("*", { count: "exact", head: true })
    .is("topicId", null);
  console.log(`📌 Questões SEM tópico: ${semTopico}`);

  // 2. Tópicos e questões aprovadas
  const { data: topics } = await db.from("Topic").select("id, name, subjectId");
  
  const { data: qCounts } = await db
    .from("Question")
    .select("topicId")
    .not("topicId", "is", null)
    .eq("aprovado", true);

  const countMap = {};
  for (const q of (qCounts || [])) {
    countMap[q.topicId] = (countMap[q.topicId] || 0) + 1;
  }

  const semQuestoes = (topics || []).filter(t => !countMap[t.id]);
  const poucos = (topics || []).filter(t => countMap[t.id] > 0 && countMap[t.id] < 10);

  console.log(`\n📚 Total de tópicos: ${(topics || []).length}`);
  console.log(`❌ Tópicos SEM questões aprovadas: ${semQuestoes.length}`);
  console.log(`⚠️  Tópicos com menos de 10 questões: ${poucos.length}`);

  // 3. PDFs na biblioteca (Material com topicId)
  const { data: mats } = await db
    .from("Material")
    .select("topicId")
    .not("topicId", "is", null);

  const comPdf = new Set((mats || []).map(m => m.topicId));
  const semPdf = (topics || []).filter(t => !comPdf.has(t.id));

  console.log(`\n📄 Tópicos COM material/PDF: ${comPdf.size}`);
  console.log(`❌ Tópicos SEM material/PDF: ${semPdf.length}`);

  console.log("\n✅ Diagnóstico concluído.");
}

main().catch(console.error);
