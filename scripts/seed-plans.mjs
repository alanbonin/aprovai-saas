/**
 * seed-plans.mjs — Atualiza/cria os planos do SaaS Aprovai
 *
 * Estrutura:
 *   Trial        — 7 dias grátis (R$ 0)
 *   Focado       — R$ 69/mês  (1 concurso, 80 msg/semana)
 *   Aprovação    — R$ 99/mês  (2 concursos, 300 msg/semana) ← mais popular
 *   Elite        — R$ 149,90/mês (ilimitado, 999 msg/semana)
 *   Prova Marcada — R$ 317 único, 12 meses, 999 msg/semana
 *
 * Uso: node scripts/seed-plans.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PLANOS = [
  {
    slug: "trial",
    name: "Trial Gratuito",
    price: 0,
    intervalDays: 7,
    aiCreditsPerWeek: 10,
    maxAgents: 1,
    active: true,
    features: [
      "7 dias grátis sem cartão",
      "1 mentor IA especializado",
      "10 mensagens com mentor/semana",
      "Questões por matéria",
      "Flashcards com repetição espaçada",
      "Relatório básico de desempenho",
    ],
  },
  {
    slug: "focado",
    name: "Focado",
    price: 69,
    intervalDays: 30,
    aiCreditsPerWeek: 80,
    maxAgents: 1,
    active: true,
    features: [
      "1 concurso-alvo principal",
      "1 mentor IA de área especializado",
      "80 mensagens com mentor/semana",
      "Questões ilimitadas por matéria",
      "Flashcards com repetição espaçada (SM-2)",
      "Redação oficial com correção por IA",
      "Estudo de casos práticos",
      "Relatório detalhado de desempenho",
      "Cronograma adaptativo semanal",
    ],
  },
  {
    slug: "aprovacao",
    name: "Aprovação",
    price: 99,
    intervalDays: 30,
    aiCreditsPerWeek: 300,
    maxAgents: 2,
    active: true,
    features: [
      "Até 2 concursos simultâneos",
      "Mentor de área + Mentor de banca (2 IAs)",
      "300 mensagens com mentor/semana",
      "Chat combinado com 2 mentores ao mesmo tempo",
      "Questões ilimitadas por matéria",
      "Flashcards e repetição espaçada avançada",
      "Redação e casos práticos",
      "Simulados por banca com gabarito IA",
      "Cronograma adaptativo semanal",
      "Relatório completo + gráficos de evolução",
    ],
  },
  {
    slug: "elite",
    name: "Elite",
    price: 149,
    intervalDays: 30,
    aiCreditsPerWeek: 9999,
    maxAgents: 5,
    active: true,
    features: [
      "Concursos ilimitados",
      "Até 5 mentores IA simultâneos",
      "Mensagens ilimitadas com mentor",
      "Chat combinado com múltiplos mentores",
      "Questões, flashcards e simulados ilimitados",
      "Redação, casos práticos e dissertações",
      "Decodificador de edital (PDF → plano de estudos)",
      "Biblioteca de PDFs + chat com documentos",
      "Modo Companhia — grupos de estudo online",
      "Cronograma adaptativo com IA avançada",
      "Memória de longo prazo do mentor",
      "Suporte prioritário",
    ],
  },
  {
    slug: "focado-anual",
    name: "Focado Anual",
    price: 708,
    intervalDays: 365,
    aiCreditsPerWeek: 80,
    maxAgents: 1,
    active: false, // ativado via painel de pagamento
    features: [
      "1 concurso-alvo principal",
      "1 mentor IA especializado",
      "80 mensagens com mentor/semana",
      "Questões ilimitadas por matéria",
      "Flashcards com repetição espaçada (SM-2)",
      "Redação oficial com correção por IA",
      "Cronograma adaptativo semanal",
      "Economia de 15% vs mensal",
    ],
  },
  {
    slug: "aprovacao-anual",
    name: "Aprovação Anual",
    price: 1008,
    intervalDays: 365,
    aiCreditsPerWeek: 300,
    maxAgents: 2,
    active: false,
    features: [
      "Até 2 concursos simultâneos",
      "Mentor de área + Mentor de banca (2 IAs)",
      "300 mensagens com mentor/semana",
      "Questões ilimitadas por matéria",
      "Flashcards e repetição espaçada avançada",
      "Redação e casos práticos",
      "Simulados no estilo da banca",
      "Cronograma adaptativo semanal",
      "Relatório completo + gráficos de evolução",
      "Economia de 15% vs mensal",
    ],
  },
  {
    slug: "elite-anual",
    name: "Elite Anual",
    price: 1524,
    intervalDays: 365,
    aiCreditsPerWeek: 9999,
    maxAgents: 5,
    active: false,
    features: [
      "Concursos ilimitados",
      "Até 5 mentores IA simultâneos",
      "Mensagens ilimitadas com mentor",
      "Decodificador de edital (PDF → plano)",
      "Biblioteca de PDFs + chat com documentos",
      "Modo Companhia — grupos de estudo online",
      "Memória de longo prazo do mentor",
      "Suporte prioritário",
      "Economia de 15% vs mensal",
    ],
  },
  {
    slug: "prova-marcada",
    name: "Prova Marcada",
    price: 317,
    intervalDays: 365,
    aiCreditsPerWeek: 9999,
    maxAgents: 3,
    active: true,
    features: [
      "Pagamento único — válido por 12 meses",
      "Ideal para quem já tem edital aberto",
      "3 mentores IA especializados",
      "Mensagens ilimitadas",
      "Cronograma de reta final com IA",
      "Decodificador de edital (PDF → matérias)",
      "Simulados no estilo da banca",
      "Sem renovação automática",
    ],
  },
];

async function main() {
  console.log("🌱 Atualizando planos do Aprovai...\n");

  for (const plano of PLANOS) {
    const { data: existing } = await db
      .from("Plan")
      .select("id, name, price")
      .eq("slug", plano.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await db
        .from("Plan")
        .update({
          name: plano.name,
          price: plano.price,
          intervalDays: plano.intervalDays,
          aiCreditsPerWeek: plano.aiCreditsPerWeek,
          maxAgents: plano.maxAgents,
          features: plano.features,
          active: plano.active,
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`  ❌ Erro ao atualizar "${plano.name}":`, error.message);
      } else {
        console.log(`  ✅ Atualizado: ${plano.name} — R$ ${plano.price}${plano.intervalDays === 365 ? " (único)" : "/mês"}`);
      }
    } else {
      const { error } = await db
        .from("Plan")
        .insert({
          id: crypto.randomUUID(),
          slug: plano.slug,
          name: plano.name,
          price: plano.price,
          intervalDays: plano.intervalDays,
          aiCreditsPerWeek: plano.aiCreditsPerWeek,
          maxAgents: plano.maxAgents,
          features: plano.features,
          active: plano.active,
          createdAt: new Date().toISOString(),
        });

      if (error) {
        console.error(`  ❌ Erro ao criar "${plano.name}":`, error.message);
      } else {
        console.log(`  🆕 Criado:    ${plano.name} — R$ ${plano.price}${plano.intervalDays === 365 ? " (único)" : "/mês"}`);
      }
    }
  }

  // Desativa planos que não estão mais na lista (exceto os slugs acima)
  const slugsAtivos = PLANOS.map(p => p.slug);
  const { data: planosExtras } = await db
    .from("Plan")
    .select("id, name, slug")
    .not("slug", "in", `(${slugsAtivos.join(",")})`);

  if (planosExtras && planosExtras.length > 0) {
    console.log(`\n⚠️  Planos extras encontrados (não desativados automaticamente):`);
    planosExtras.forEach(p => console.log(`   - "${p.name}" (slug: ${p.slug})`));
  }

  // Verifica resultado final
  const { data: todos } = await db.from("Plan").select("name, slug, price, aiCreditsPerWeek, maxAgents, active").order("price");
  console.log("\n📋 Planos ativos no banco:");
  todos?.forEach(p => {
    const status = p.active ? "✅" : "🔴";
    console.log(`  ${status} ${p.name.padEnd(18)} R$${String(p.price).padStart(4)} | ${String(p.aiCreditsPerWeek).padStart(5)} msg/sem | ${p.maxAgents} mentor(es)`);
  });

  console.log("\n✨ Planos atualizados com sucesso!");
}

main().catch(console.error);
