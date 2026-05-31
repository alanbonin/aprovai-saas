import { createClient } from "@supabase/supabase-js";
import { getMateriasParaCargo } from "../src/lib/materias-por-cargo";
import { resolveCargoId } from "../src/lib/cargos";

// Carrega .env manualmente
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq < 0) return;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  });
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function simular(cargoTexto: string, orgaoTexto: string) {
  console.log(`\n=== ${cargoTexto} | ${orgaoTexto} ===`);
  const resolved = resolveCargoId(cargoTexto, orgaoTexto);
  if (!resolved) { console.log("❌ cargoId não resolvido"); return; }
  console.log(`→ cargoId: ${resolved.cargoId} | estado: ${resolved.estado ?? "nenhum"}`);

  const materias = getMateriasParaCargo(resolved.cargoId, resolved.estado);
  const { data: found } = await db.from("Subject").select("name").in("name", materias);
  const nomesBanco = new Set(found?.map((s: any) => s.name));
  const faltam = materias.filter(m => !nomesBanco.has(m));

  materias.forEach((m, i) => console.log(`  ${nomesBanco.has(m) ? "✓" : "✗"} ${i+1}. ${m}`));

  if (faltam.length) console.log(`❌ FALTAM (${faltam.length}): ${faltam.join(", ")}`);
  else console.log(`✅ ${found?.length}/${materias.length} — TUDO OK!`);
}

async function main() {
  await simular("Agente / Investigador de Polícia Civil", "PC-BA");
  await simular("Delegado de Polícia Civil", "PC-SP");
  await simular("Escrivão de Polícia Civil", "PC-MG");
  await simular("Agente de Polícia Federal", "PF");
  await simular("Escriturário", "Banco do Brasil");
  await simular("Técnico do Seguro Social", "INSS");
  await simular("Analista Judiciário", "TRF");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
