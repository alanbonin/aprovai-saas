/**
 * seed-plans.mjs — Atualiza/cria os planos do SaaS Aprovai
 *
 * IMPORTANTE: Antes de rodar este script pela primeira vez,
 * execute migration-plans-v4.sql no Supabase SQL Editor:
 * https://supabase.com/dashboard/project/eyurnrzzznlqnhltjhwg/sql
 *
 * Estrutura:
 *   Trial        — 7 dias grátis (R$ 0)
 *   Focado       — R$ 69/mês  (1 concurso, 80 msgs/semana)
 *   Aprovação    — R$ 99/mês  (2 concursos, 300 msgs/semana) ← mais popular
 *   Elite        — R$ 149/mês (ilimitado, 9999 msgs/semana)
 *   Focado Anual — R$ 745 (-10%)
 *   Aprovação Anual — R$ 1.069 (-10%)
 *   Elite Anual  — R$ 1.611 (-10%)
 *
 * Uso: node --env-file=.env scripts/seed-plans.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PLANOS = [
  // ── TRIAL GRATUITO ──────────────────────────────────────────
  {
    slug: "trial",
    name: "Trial Gratuito",
    price: 0,
    intervalDays: 7,
    aiCreditsPerWeek: 10,
    maxAgents: 1,
    maxProfiles: 1,
    maxQuestionsPerWeek: 10,
    maxFlashcardsPerWeek: 10,
    maxSimuladosPerWeek: 0,
    maxRedacoesPerWeek: 2,
    maxCasosPerWeek: 2,
    maxPdfPerWeek: 0,
    hasGroupStudy: true,
    hasLongTermMemory: false,
    hasPdfLibrary: false,
    hasArena: false,
    hasAdaptativo: false,
    hasCompanhia: false,
    active: true,
    features: [
      "7 dias grátis sem cartão",
      "1 mentor IA especializado",
      "10 mensagens com mentor/semana",
      "10 questões por semana",
      "10 flashcards por semana",
      "Até 2 redações/semana",
      "Até 2 casos práticos/semana",
      "Relatório básico de desempenho",
      "Grupos de estudo",
    ],
  },

  // ── FOCADO ──────────────────────────────────────────────────
  {
    slug: "focado",
    name: "Focado",
    price: 69,
    intervalDays: 30,
    aiCreditsPerWeek: 80,
    maxAgents: 1,
    maxProfiles: 1,
    maxQuestionsPerWeek: -1,
    maxFlashcardsPerWeek: -1,
    maxSimuladosPerWeek: 7,
    maxRedacoesPerWeek: 7,
    maxCasosPerWeek: 7,
    maxPdfPerWeek: 0,
    hasGroupStudy: true,
    hasLongTermMemory: true,
    hasPdfLibrary: false,
    hasArena: false,
    hasAdaptativo: false,
    hasCompanhia: false,
    active: true,
    features: [
      "1 concurso-alvo principal",
      "1 mentor IA de área especializado",
      "80 mensagens com mentor/semana",
      "Questões ilimitadas por matéria",
      "Flashcards ilimitados com repetição espaçada (SM-2)",
      "Até 7 simulados/semana",
      "Redação oficial com correção por IA (7/sem)",
      "Estudo de casos práticos (7/sem)",
      "Relatório detalhado de desempenho",
      "Cronograma adaptativo semanal",
      "Memória de longo prazo do mentor",
      "Grupos de estudo",
    ],
  },

  // ── APROVAÇÃO ───────────────────────────────────────────────
  {
    slug: "aprovacao",
    name: "Aprovação",
    price: 99,
    intervalDays: 30,
    aiCreditsPerWeek: 300,
    maxAgents: 2,
    maxProfiles: 2,
    maxQuestionsPerWeek: -1,
    maxFlashcardsPerWeek: -1,
    maxSimuladosPerWeek: 21,
    maxRedacoesPerWeek: 21,
    maxCasosPerWeek: 21,
    maxPdfPerWeek: -1,
    hasGroupStudy: true,
    hasLongTermMemory: true,
    hasPdfLibrary: true,
    hasArena: true,
    hasAdaptativo: true,
    hasCompanhia: false,
    active: true,
    features: [
      "Até 2 concursos simultâneos",
      "Mentor de área + Mentor de banca (2 IAs)",
      "300 mensagens com mentor/semana",
      "Questões ilimitadas por matéria",
      "Flashcards ilimitados com repetição espaçada avançada",
      "Até 21 simulados/semana no estilo da banca",
      "Redação e casos práticos (21/sem cada)",
      "Biblioteca de PDFs + chat com documentos",
      "Arena de competição entre estudantes",
      "Modo Adaptativo por IA",
      "Cronograma adaptativo semanal",
      "Relatório completo + gráficos de evolução",
      "Memória de longo prazo do mentor",
      "Grupos de estudo",
    ],
  },

  // ── ELITE ───────────────────────────────────────────────────
  {
    slug: "elite",
    name: "Elite",
    price: 149,
    intervalDays: 30,
    aiCreditsPerWeek: 9999,
    maxAgents: 5,
    maxProfiles: 5,
    maxQuestionsPerWeek: -1,
    maxFlashcardsPerWeek: -1,
    maxSimuladosPerWeek: -1,
    maxRedacoesPerWeek: -1,
    maxCasosPerWeek: -1,
    maxPdfPerWeek: -1,
    hasGroupStudy: true,
    hasLongTermMemory: true,
    hasPdfLibrary: true,
    hasArena: true,
    hasAdaptativo: true,
    hasCompanhia: true,
    active: true,
    features: [
      "Concursos ilimitados (até 5 perfis)",
      "Até 5 mentores IA simultâneos",
      "Mensagens ilimitadas com mentor",
      "Questões, flashcards e simulados ilimitados",
      "Redação, casos práticos ilimitados",
      "Biblioteca de PDFs + chat com documentos",
      "Arena de competição entre estudantes",
      "Modo Adaptativo avançado por IA",
      "Modo Companhia — IA de acompanhamento de sessão",
      "Cronograma adaptativo com IA avançada",
      "Memória de longo prazo do mentor",
      "Grupos de estudo ilimitados",
      "Suporte prioritário",
    ],
  },

  // ── FOCADO ANUAL ────────────────────────────────────────────
  {
    slug: "focado-anual",
    name: "Focado Anual",
    price: 745,
    intervalDays: 365,
    aiCreditsPerWeek: 80,
    maxAgents: 1,
    maxProfiles: 1,
    maxQuestionsPerWeek: -1,
    maxFlashcardsPerWeek: -1,
    maxSimuladosPerWeek: 7,
    maxRedacoesPerWeek: 7,
    maxCasosPerWeek: 7,
    maxPdfPerWeek: 0,
    hasGroupStudy: true,
    hasLongTermMemory: true,
    hasPdfLibrary: false,
    hasArena: false,
    hasAdaptativo: false,
    hasCompanhia: false,
    active: false, // ativado via painel de pagamento
    features: [
      "1 concurso-alvo principal",
      "1 mentor IA especializado",
      "80 mensagens com mentor/semana",
      "Questões e flashcards ilimitados",
      "7 simulados, redações e casos/semana",
      "Memória de longo prazo do mentor",
      "Grupos de estudo",
      "Economia de 10% vs mensal",
    ],
  },

  // ── APROVAÇÃO ANUAL ─────────────────────────────────────────
  {
    slug: "aprovacao-anual",
    name: "Aprovação Anual",
    price: 1069,
    intervalDays: 365,
    aiCreditsPerWeek: 300,
    maxAgents: 2,
    maxProfiles: 2,
    maxQuestionsPerWeek: -1,
    maxFlashcardsPerWeek: -1,
    maxSimuladosPerWeek: 21,
    maxRedacoesPerWeek: 21,
    maxCasosPerWeek: 21,
    maxPdfPerWeek: -1,
    hasGroupStudy: true,
    hasLongTermMemory: true,
    hasPdfLibrary: true,
    hasArena: true,
    hasAdaptativo: true,
    hasCompanhia: false,
    active: false,
    features: [
      "Até 2 concursos simultâneos",
      "300 mensagens com mentor/semana",
      "Questões e flashcards ilimitados",
      "Biblioteca de PDFs, Arena e Modo Adaptativo",
      "Economia de 10% vs mensal",
    ],
  },

  // ── ELITE ANUAL ─────────────────────────────────────────────
  {
    slug: "elite-anual",
    name: "Elite Anual",
    price: 1611,
    intervalDays: 365,
    aiCreditsPerWeek: 9999,
    maxAgents: 5,
    maxProfiles: 5,
    maxQuestionsPerWeek: -1,
    maxFlashcardsPerWeek: -1,
    maxSimuladosPerWeek: -1,
    maxRedacoesPerWeek: -1,
    maxCasosPerWeek: -1,
    maxPdfPerWeek: -1,
    hasGroupStudy: true,
    hasLongTermMemory: true,
    hasPdfLibrary: true,
    hasArena: true,
    hasAdaptativo: true,
    hasCompanhia: true,
    active: false,
    features: [
      "Tudo do Elite mensal",
      "Concursos ilimitados (até 5 perfis)",
      "Mensagens ilimitadas",
      "Todos os recursos desbloqueados",
      "Economia de 10% vs mensal",
      "Suporte prioritário",
    ],
  },
];

// Campos que dependem da migration-plans-v4.sql
const NOVOS_CAMPOS = ["hasPdfLibrary", "hasArena", "hasAdaptativo", "hasCompanhia"];

async function verificarColunas() {
  const { error } = await db.from("Plan").select("hasPdfLibrary, hasArena, hasAdaptativo, hasCompanhia").limit(1);
  return !error;
}

async function main() {
  console.log("🌱 Atualizando planos do Aprovai...\n");

  const colunasNovas = await verificarColunas();
  if (!colunasNovas) {
    console.warn("⚠️  Colunas hasPdfLibrary/hasArena/hasAdaptativo/hasCompanhia não existem ainda.");
    console.warn("   Execute scripts/migration-plans-v4.sql no Supabase SQL Editor antes de continuar.");
    console.warn("   https://supabase.com/dashboard/project/eyurnrzzznlqnhltjhwg/sql\n");
  }

  for (const plano of PLANOS) {
    const { data: existing } = await db
      .from("Plan")
      .select("id, name, price")
      .eq("slug", plano.slug)
      .maybeSingle();

    // Dados base (sem campos novos se colunas não existem)
    const dadosBase = {
      name: plano.name,
      price: plano.price,
      intervalDays: plano.intervalDays,
      aiCreditsPerWeek: plano.aiCreditsPerWeek,
      maxAgents: plano.maxAgents,
      maxProfiles: plano.maxProfiles,
      maxQuestionsPerWeek: plano.maxQuestionsPerWeek,
      maxFlashcardsPerWeek: plano.maxFlashcardsPerWeek,
      maxSimuladosPerWeek: plano.maxSimuladosPerWeek,
      maxRedacoesPerWeek: plano.maxRedacoesPerWeek,
      maxCasosPerWeek: plano.maxCasosPerWeek,
      maxPdfPerWeek: plano.maxPdfPerWeek,
      hasGroupStudy: plano.hasGroupStudy,
      hasLongTermMemory: plano.hasLongTermMemory,
      features: plano.features,
      active: plano.active,
    };

    if (colunasNovas) {
      dadosBase.hasPdfLibrary = plano.hasPdfLibrary;
      dadosBase.hasArena = plano.hasArena;
      dadosBase.hasAdaptativo = plano.hasAdaptativo;
      dadosBase.hasCompanhia = plano.hasCompanhia;
    }

    if (existing) {
      const { error } = await db.from("Plan").update(dadosBase).eq("id", existing.id);
      if (error) {
        console.error(`  ❌ Erro ao atualizar "${plano.name}":`, error.message);
      } else {
        console.log(`  ✅ Atualizado: ${plano.name} — R$ ${plano.price}${plano.intervalDays === 365 ? " (anual)" : "/mês"}`);
      }
    } else {
      const { error } = await db.from("Plan").insert({
        id: crypto.randomUUID(),
        slug: plano.slug,
        ...dadosBase,
        createdAt: new Date().toISOString(),
      });
      if (error) {
        console.error(`  ❌ Erro ao criar "${plano.name}":`, error.message);
      } else {
        console.log(`  🆕 Criado:    ${plano.name} — R$ ${plano.price}${plano.intervalDays === 365 ? " (anual)" : "/mês"}`);
      }
    }
  }

  // Desativa planos legados que não estão mais na lista
  const slugsAtivos = PLANOS.map(p => p.slug);
  const { data: planosExtras } = await db
    .from("Plan")
    .select("id, name, slug")
    .not("slug", "in", `(${slugsAtivos.join(",")})`);

  if (planosExtras && planosExtras.length > 0) {
    console.log(`\n⚠️  Planos extras não gerenciados por este script:`);
    planosExtras.forEach(p => console.log(`   - "${p.name}" (slug: ${p.slug})`));
  }

  // Resultado final
  const { data: todos } = await db
    .from("Plan")
    .select("name, slug, price, aiCreditsPerWeek, maxAgents, maxProfiles, active")
    .order("price");

  console.log("\n📋 Planos no banco:");
  todos?.forEach(p => {
    const status = p.active ? "✅" : "🔴";
    console.log(
      `  ${status} ${p.name.padEnd(20)} R$${String(p.price).padStart(5)} | ${String(p.aiCreditsPerWeek).padStart(5)} msg/sem | ${p.maxAgents} mentor(es) | ${p.maxProfiles} concurso(s)`
    );
  });

  if (!colunasNovas) {
    console.log("\n⚠️  AÇÃO NECESSÁRIA: Execute migration-plans-v4.sql para adicionar os novos campos.");
    console.log("   Depois rode este script novamente para atualizar hasPdfLibrary/hasArena/hasAdaptativo/hasCompanhia.");
  } else {
    console.log("\n✨ Planos atualizados com sucesso!");
  }
}

main().catch(console.error);
