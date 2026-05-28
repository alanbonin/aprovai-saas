/**
 * Migration: Cria tabela Topic (assuntos dentro de matérias)
 * Uso: node scripts/migration-topics.mjs
 */
import pg from "pg";
const { Client } = pg;

try { const { config } = await import("dotenv"); config({ path: ".env" }); } catch {}

// Supabase expõe porta 5432 via pooler — formato correto:
// postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida no .env");
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MIGRATION_SQL = [
  // 1. Cria tabela Topic
  `CREATE TABLE IF NOT EXISTS "Topic" (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "subjectId" TEXT        NOT NULL REFERENCES "Subject"(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL,
    description TEXT,
    ordem       INT         NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("subjectId", slug)
  )`,

  // 2. Índices
  `CREATE INDEX IF NOT EXISTS "Topic_subjectId_idx" ON "Topic"("subjectId")`,
  `CREATE INDEX IF NOT EXISTS "Topic_slug_idx" ON "Topic"(slug)`,

  // 3. Adiciona topicId em Question (nullable)
  `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "topicId" UUID REFERENCES "Topic"(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS "Question_topicId_idx" ON "Question"("topicId")`,

  // 4. Adiciona topicId em Progress (para stats por assunto)
  `ALTER TABLE "Progress" ADD COLUMN IF NOT EXISTS "topicId" UUID REFERENCES "Topic"(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS "Progress_topicId_idx" ON "Progress"("topicId")`,

  // 5. Também adiciona campos extras em Question para melhor organização
  `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "artigo" TEXT`,
  `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "dicaBanca" TEXT`,
  `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "aprovado" BOOLEAN NOT NULL DEFAULT true`,

  // 6. Trigger para updatedAt automático em Topic
  `CREATE OR REPLACE FUNCTION update_topic_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW."updatedAt" = now();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS topic_updated_at ON "Topic"`,

  `CREATE TRIGGER topic_updated_at
   BEFORE UPDATE ON "Topic"
   FOR EACH ROW EXECUTE FUNCTION update_topic_updated_at()`,

  // 7. RLS
  `ALTER TABLE "Topic" ENABLE ROW LEVEL SECURITY`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename = 'Topic' AND policyname = 'Topic: leitura autenticados'
     ) THEN
       CREATE POLICY "Topic: leitura autenticados"
         ON "Topic" FOR SELECT
         USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
     END IF;
   END $$`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename = 'Topic' AND policyname = 'Topic: escrita service_role'
     ) THEN
       CREATE POLICY "Topic: escrita service_role"
         ON "Topic" FOR ALL
         USING (auth.role() = 'service_role')
         WITH CHECK (auth.role() = 'service_role');
     END IF;
   END $$`,
];

console.log("🔌 Conectando ao banco de dados...");
try {
  await client.connect();
  console.log("✅ Conexão estabelecida!\n");

  for (const sql of MIGRATION_SQL) {
    const preview = sql.trim().slice(0, 60).replace(/\s+/g, ' ');
    try {
      await client.query(sql);
      console.log(`  ✅ OK: ${preview}...`);
    } catch (err) {
      if (err.message.includes("already exists") || err.message.includes("já existe")) {
        console.log(`  ⚠️  Já existe: ${preview}...`);
      } else {
        console.error(`  ❌ Erro: ${preview}...`);
        console.error(`     ${err.message}`);
      }
    }
  }

  // Verifica resultado
  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Topic' ORDER BY ordinal_position
  `);
  console.log(`\n📊 Tabela Topic criada com colunas: ${rows.map(r => r.column_name).join(', ')}`);

  const { rows: qCols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Question' AND column_name = 'topicId'
  `);
  console.log(`📊 Question.topicId: ${qCols.length > 0 ? '✅ existe' : '❌ não existe'}`);

  console.log("\n🎉 Migration concluída!");
} catch (err) {
  console.error("❌ Falha na conexão:", err.message);
  console.log("\n📋 Execute o SQL manualmente no Supabase Dashboard:");
  console.log("https://app.supabase.com/project/eyurnrzzznlqnhltjhwg/editor\n");
  console.log(MIGRATION_SQL.join(';\n\n') + ';');
} finally {
  await client.end();
}
