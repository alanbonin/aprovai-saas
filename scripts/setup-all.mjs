/**
 * setup-all.mjs — Setup completo do banco de dados Aprovai
 *
 * Executa todos os seeds em ordem:
 *   1. Planos         → seed-plans.mjs
 *   2. Agentes        → seed-agents.mjs
 *   3. Matérias       → seed-subjects.mjs
 *
 * Uso: node scripts/setup-all.mjs
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

const SEEDS = [
  { name: "Planos",   file: "seed-plans.mjs" },
  { name: "Agentes",  file: "seed-agents.mjs" },
  { name: "Matérias", file: "seed-subjects.mjs" },
];

const BAR = "─".repeat(60);

function run(file) {
  const path = resolve(__dir, file);
  if (!existsSync(path)) {
    console.error(`  ⚠️  Arquivo não encontrado: ${file}`);
    return false;
  }
  try {
    execSync(`node "${path}"`, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`  🚀  Aprovai — Setup Completo do Banco`);
console.log(`${"═".repeat(60)}\n`);

let ok = 0;
let fail = 0;

for (const seed of SEEDS) {
  console.log(`\n${BAR}`);
  console.log(`  📦  ${seed.name}`);
  console.log(`${BAR}\n`);
  const success = run(seed.file);
  if (success) ok++; else fail++;
}

console.log(`\n${"═".repeat(60)}`);
if (fail === 0) {
  console.log(`  ✅  Setup concluído com sucesso! (${ok}/${SEEDS.length} steps)`);
} else {
  console.log(`  ⚠️  Setup concluído com erros: ${ok} ok · ${fail} com falha`);
}
console.log(`${"═".repeat(60)}\n`);
