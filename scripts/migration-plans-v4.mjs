/**
 * Adiciona colunas novas ao model Plan:
 *   hasPdfLibrary, hasArena, hasAdaptativo, hasCompanhia
 *
 * Uso: node --env-file=.env scripts/migration-plans-v4.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SQL = `
  ALTER TABLE "Plan"
    ADD COLUMN IF NOT EXISTS "hasPdfLibrary" boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "hasArena"      boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "hasAdaptativo" boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "hasCompanhia"  boolean DEFAULT false;
`;

console.log("🔧 Rodando migration plans v4 (novos campos booleanos)...\n");

const { error } = await db.rpc('exec_sql', { sql: SQL });
if (error) {
  console.log("RPC exec_sql não disponível, tentando via fetch SQL direto...");
  // Tenta via endpoint postgres
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(".supabase.co", ".supabase.co");
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: SQL }),
  });
  if (!res.ok) {
    console.error("❌ Falha ao executar via RPC. Execute manualmente no Supabase SQL Editor:");
    console.log("\nhttps://supabase.com/dashboard/project/_/sql\n");
    console.log(SQL);
    process.exit(1);
  }
}

// Verifica se colunas existem
const { data, error: checkErr } = await db.from("Plan").select("hasPdfLibrary, hasArena, hasAdaptativo, hasCompanhia").limit(1);
if (checkErr) {
  console.error("❌ Colunas ainda não existem:", checkErr.message);
  console.log("\n📋 Execute manualmente no Supabase SQL Editor:");
  console.log(SQL);
} else {
  console.log("✅ Migration executada — colunas existem no banco!");
}
