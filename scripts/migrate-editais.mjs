import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Supabase v2: use db.from para verificar conexão
const { data: test } = await db.from("User").select("id").limit(1);
console.log("Conexão OK:", test ? "sim" : "erro");

// Executa cada statement via fetch na REST API SQL do Supabase
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sql(query) {
  const res = await fetch(`${baseUrl}/rest/v1/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ query }),
  });
  return res;
}

// Usa a API de postgres do Supabase
async function execSQL(query) {
  const res = await fetch(`${baseUrl}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

const result = await execSQL("SELECT 1");
console.log("pg/query test:", result);
