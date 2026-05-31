#!/usr/bin/env node
/**
 * migrar-materias-por-perfil.mjs
 *
 * Migra StudentSubject de profileId=null para perfis específicos.
 * Para cada perfil com cargo definido, busca as matérias do edital
 * e cria registros com o profileId correto.
 *
 * Uso:
 *   node scripts/migrar-materias-por-perfil.mjs         # todos os usuários
 *   node scripts/migrar-materias-por-perfil.mjs --dry   # preview sem alterar
 *   node scripts/migrar-materias-por-perfil.mjs --email prf@gmail.com
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega .env manualmente
function loadEnv() {
  const envPath = join(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const EMAIL_FILTER = (() => { const i = args.indexOf("--email"); return i >= 0 ? args[i + 1] : null; })();

// Mapeamento de cargo → matérias (simplificado por keywords no cargo)
const CARGO_MATERIAS = {
  prf: ["Legislação de Trânsito", "Física", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Informática", "Direito Penal", "Direito Processual Penal", "Legislação Específica", "Ética no Serviço Público"],
  "policia civil": ["Direito Penal", "Direito Processual Penal", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Criminologia", "Medicina Legal", "Legislação Específica", "Ética no Serviço Público"],
  "policia federal": ["Direito Penal", "Direito Processual Penal", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Informática", "Legislação Específica", "Ética no Serviço Público", "Contabilidade Geral"],
  "tcu": ["Controle Externo e TCU", "Contabilidade Pública", "Auditoria Governamental", "Orçamento Público", "Finanças Públicas", "Administração Pública", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Controle Interno e Compliance Público"],
  "tribunal de contas": ["Controle Externo e TCU", "Contabilidade Pública", "Auditoria Governamental", "Orçamento Público", "Finanças Públicas", "Administração Pública", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico"],
  "analista": ["Administração Pública", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Informática", "Ética no Serviço Público"],
  "fiscal": ["Direito Tributário", "Direito Financeiro", "Contabilidade Geral", "Finanças Públicas", "Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Matemática"],
};

function getMateriasForCargo(cargo, orgao) {
  const text = `${cargo} ${orgao}`.toLowerCase();
  for (const [key, materias] of Object.entries(CARGO_MATERIAS)) {
    if (text.includes(key)) return materias;
  }
  // fallback genérico
  return ["Direito Constitucional", "Direito Administrativo", "Língua Portuguesa", "Raciocínio Lógico", "Ética no Serviço Público"];
}

async function main() {
  console.log(`\n🔄 Migração de matérias por perfil${DRY ? " [DRY RUN]" : ""}${EMAIL_FILTER ? ` [${EMAIL_FILTER}]` : ""}\n`);

  // Busca usuários
  let userQuery = db.from("User").select("id, email").eq("role", "STUDENT");
  if (EMAIL_FILTER) userQuery = userQuery.eq("email", EMAIL_FILTER);
  const { data: users } = await userQuery;

  if (!users?.length) { console.log("Nenhum usuário encontrado."); return; }

  let totalMigrados = 0;
  let totalPulados = 0;

  for (const user of users) {
    // Busca perfis
    const { data: profiles } = await db.from("StudentProfile")
      .select("id, cargo, orgao")
      .eq("userId", user.id)
      .eq("onboardingDone", true);

    if (!profiles?.length) continue;
    if (profiles.length <= 1) { totalPulados++; continue; } // 1 perfil não precisa migrar

    // Busca matérias legadas (profileId = null)
    const { data: legacySubs } = await db.from("StudentSubject")
      .select("subjectId, Subject(name)")
      .eq("userId", user.id)
      .is("profileId", null);

    if (!legacySubs?.length) { totalPulados++; continue; }

    const allSubjectNames = legacySubs.map(s => s.Subject?.name ?? "").filter(Boolean);
    console.log(`👤 ${user.email} — ${profiles.length} perfis, ${legacySubs.length} matérias legadas`);

    for (const profile of profiles) {
      // Verifica se já tem matérias com profileId
      const { data: existing } = await db.from("StudentSubject")
        .select("id")
        .eq("userId", user.id)
        .eq("profileId", profile.id)
        .limit(1);

      if (existing?.length) {
        console.log(`  ✅ ${profile.cargo} — já tem matérias específicas`);
        continue;
      }

      // Determina matérias para este cargo
      const materiasIdeal = getMateriasForCargo(profile.cargo ?? "", profile.orgao ?? "");

      // Encontra as matérias legadas que batem com este cargo
      const materiasParaAtribuir = legacySubs.filter(s => {
        const nome = s.Subject?.name ?? "";
        return materiasIdeal.some(m =>
          nome.toLowerCase().includes(m.toLowerCase().slice(0, 8)) ||
          m.toLowerCase().includes(nome.toLowerCase().slice(0, 8))
        );
      });

      // Se não achou match suficiente, usa as matérias legadas todas (melhor do que nada)
      const subsParaInserir = materiasParaAtribuir.length >= 3 ? materiasParaAtribuir : legacySubs;

      console.log(`  📚 ${profile.cargo} → ${subsParaInserir.length} matérias`);
      subsParaInserir.forEach(s => console.log(`     - ${s.Subject?.name}`));

      if (!DRY) {
        const now = new Date().toISOString();
        const inserts = subsParaInserir.map(s => ({
          userId: user.id,
          profileId: profile.id,
          subjectId: s.subjectId,
          fromEdital: false,
          createdAt: now,
        }));

        const { error } = await db.from("StudentSubject").insert(inserts);
        if (error) console.log(`  ❌ Erro: ${error.message}`);
        else totalMigrados += inserts.length;
      }
    }
  }

  console.log(`\n✅ Migração concluída`);
  console.log(`   Registros inseridos: ${DRY ? "(dry)" : totalMigrados}`);
  console.log(`   Usuários pulados: ${totalPulados}`);
}

main().catch(console.error);
