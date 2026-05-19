/**
 * Migração: adiciona colunas extras ao StudentProfile
 * Uso: node scripts/migrate-student-profile.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Lê .env manualmente
const env = readFileSync(".env", "utf8");
const get = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY  = get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Variáveis de ambiente não encontradas");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Verifica colunas existentes via PostgREST ─────────────────────────────────
// Como não podemos rodar SQL direto via JS client, usamos uma estratégia:
// tentamos inserir/atualizar um registro de teste e analisamos o erro,
// OU verificamos via a API de schema do Supabase.

async function checkColumn(table, column) {
  // Tenta selecionar a coluna — se não existir, PostgREST retorna erro
  const { error } = await db.from(table).select(column).limit(1);
  return !error; // true = coluna existe
}

async function addColumnViaRpc(columnDef) {
  // Usa a REST API do Supabase Management (requer access token)
  // Fallback: verifica se coluna já existe e informa o usuário
  return null;
}

console.log("🔍 Verificando colunas em StudentProfile...\n");

const horasOk  = await checkColumn("StudentProfile", "horasEstudo");
const nivelOk  = await checkColumn("StudentProfile", "nivelAtual");
const dispOk   = await checkColumn("StudentProfile", "disponibilidade");

console.log(`  horasEstudo:     ${horasOk  ? "✅ já existe" : "❌ FALTANDO"}`);
console.log(`  nivelAtual:      ${nivelOk  ? "✅ já existe" : "❌ FALTANDO"}`);
console.log(`  disponibilidade: ${dispOk   ? "✅ já existe" : "❌ FALTANDO"}`);

if (horasOk && nivelOk && dispOk) {
  console.log("\n✅ Todas as colunas já existem. Nenhuma migração necessária.");
  process.exit(0);
}

console.log("\n⚠️  Colunas faltando. Execute no Supabase SQL Editor:");
console.log("   https://supabase.com/dashboard/project/eyurnrzzznlqnhltjhwg/sql/new");
console.log("\nSQL para executar:");
console.log(`
ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "horasEstudo"     INTEGER,
  ADD COLUMN IF NOT EXISTS "nivelAtual"      TEXT,
  ADD COLUMN IF NOT EXISTS "disponibilidade" TEXT;
`);
