/**
 * Cria ou promove um usuário para ADMIN.
 * Uso: node scripts/create-admin.mjs email@exemplo.com
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomUUID } from "crypto";

config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/create-admin.mjs seu@email.com");
  process.exit(1);
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Verifica se já existe no banco de dados
const { data: existing } = await db.from("User").select("id, email, role").eq("email", email).single();

if (existing) {
  if (existing.role === "ADMIN") {
    console.log(`✅ ${email} já é ADMIN.`);
  } else {
    const now = new Date().toISOString();
    await db.from("User").update({ role: "ADMIN", updatedAt: now }).eq("id", existing.id);
    console.log(`✅ ${email} promovido para ADMIN com sucesso!`);
  }
} else {
  // Cria no Supabase Auth e no banco
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email,
    password: "Aprovai@2025!",
    email_confirm: true,
    user_metadata: { name: "Administrador" },
  });

  if (authErr) {
    console.error("❌ Erro no Auth:", authErr.message);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const { error: dbErr } = await db.from("User").insert({
    id: randomUUID(),
    supabaseId: authUser.user.id,
    name: "Administrador",
    email,
    role: "ADMIN",
    createdAt: now,
    updatedAt: now,
  });

  if (dbErr) {
    console.error("❌ Erro ao inserir no banco:", dbErr.message);
    process.exit(1);
  }

  console.log(`✅ Admin criado: ${email} / senha: Aprovai@2025!`);
  console.log("⚠️  Altere a senha no primeiro login!");
}
