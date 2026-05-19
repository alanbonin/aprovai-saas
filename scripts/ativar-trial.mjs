/**
 * ativar-trial.mjs — Ativa Trial de 7 dias para todos os usuários sem subscription ativa
 *
 * Uso: node scripts/ativar-trial.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("🔍 Buscando plano Trial...");

  // Busca o plano trial
  const { data: trialPlan, error: planErr } = await db
    .from("Plan")
    .select("id, name, slug")
    .eq("slug", "trial")
    .eq("active", true)
    .maybeSingle();

  if (planErr || !trialPlan) {
    console.error("❌ Plano trial não encontrado. Execute seed-plans.mjs primeiro.");
    process.exit(1);
  }
  console.log(`✅ Plano encontrado: ${trialPlan.name} (${trialPlan.id})`);

  // Busca todos os usuários
  const { data: users, error: usersErr } = await db.from("User").select("id, email, name");
  if (usersErr) { console.error("❌ Erro ao buscar usuários:", usersErr.message); process.exit(1); }

  console.log(`👥 ${users.length} usuário(s) encontrado(s)`);

  let ativados = 0;
  let jaAtivos = 0;

  for (const user of users) {
    // Verifica se já tem subscription ativa
    const { data: sub } = await db
      .from("Subscription")
      .select("id, status, endDate")
      .eq("userId", user.id)
      .maybeSingle();

    if (sub) {
      const isExpired = new Date(sub.endDate) < new Date();
      if (!isExpired) {
        console.log(`  ⏭  ${user.email} — já tem subscription ativa (${sub.status}, até ${sub.endDate?.slice(0,10)})`);
        jaAtivos++;
        continue;
      }
      // Tem mas expirou — atualiza para trial fresco
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      await db.from("Subscription").update({
        planId: trialPlan.id,
        status: "ACTIVE",
        startDate: now,
        endDate: trialEnd,
        updatedAt: now,
      }).eq("id", sub.id);
      console.log(`  ✅ ${user.email} — trial reativado até ${trialEnd.slice(0,10)}`);
      ativados++;
    } else {
      // Cria subscription trial
      const now = new Date().toISOString();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: insErr } = await db.from("Subscription").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        planId: trialPlan.id,
        status: "ACTIVE",
        startDate: now,
        endDate: trialEnd,
        createdAt: now,
        updatedAt: now,
      });
      if (insErr) {
        console.error(`  ❌ ${user.email} — erro: ${insErr.message}`);
      } else {
        console.log(`  ✅ ${user.email} — trial ativado até ${trialEnd.slice(0,10)}`);
        ativados++;
      }
    }
  }

  console.log(`\n🎉 Concluído! ${ativados} ativado(s), ${jaAtivos} já ativo(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
