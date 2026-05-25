/**
 * Roda a migração add-modalidade-columns via Supabase RPC
 * Uso: node scripts/run-migration.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SQL = `
  ALTER TABLE "StudentProfile"
    ADD COLUMN IF NOT EXISTS "modalidade"   TEXT NOT NULL DEFAULT 'CONCURSO_PUBLICO',
    ADD COLUMN IF NOT EXISTS "vestibular"   TEXT,
    ADD COLUMN IF NOT EXISTS "trilha"       TEXT,
    ADD COLUMN IF NOT EXISTS "oabFase"      TEXT,
    ADD COLUMN IF NOT EXISTS "banca"        TEXT;
`;

// Step 1: Create a helper function to run DDL
const { error: createErr } = await db.rpc('exec_sql', { sql: SQL });
if (createErr && !createErr.message.includes('already exists')) {
  console.log('RPC exec_sql not available, trying alternative...');

  // Step 2: Try via REST with a custom header
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: SQL }),
  });
  console.log('REST attempt status:', res.status);
}

// Step 3: Verify
const { data, error: checkErr } = await db.from('StudentProfile').select('modalidade').limit(1);
if (checkErr) {
  console.error('❌ Coluna "modalidade" ainda não existe:', checkErr.message);
  console.log('\n📋 Execute o SQL abaixo manualmente no Supabase Dashboard:');
  console.log('https://app.supabase.com/project/eyurnrzzznlqnhltjhwg/editor');
  console.log('\n' + SQL);
} else {
  console.log('✅ Migração confirmada — colunas existem no banco!');
}
