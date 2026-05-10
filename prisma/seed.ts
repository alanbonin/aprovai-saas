import { PrismaClient } from "@prisma/client";
import { buildAgentSystemPrompt, CATEGORIAS, BANCAS } from "../src/lib/agents";

const prisma = new PrismaClient();

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

async function main() {
  console.log("🌱 Seeding...");

  // Planos
  await prisma.plan.upsert({
    where: { slug: "gratuito" },
    create: {
      name: "Gratuito",
      slug: "gratuito",
      price: 0,
      intervalDays: 36500,
      aiCreditsPerWeek: 5,
      features: ["Acesso a questões básicas", "Simulado limitado", "1 mentor por área"],
    },
    update: {},
  });

  await prisma.plan.upsert({
    where: { slug: "essencial" },
    create: {
      name: "Essencial",
      slug: "essencial",
      price: 49.90,
      intervalDays: 30,
      aiCreditsPerWeek: 30,
      features: ["Todas as questões", "Simulados ilimitados", "Todos os mentores", "Materiais de estudo"],
    },
    update: {},
  });

  await prisma.plan.upsert({
    where: { slug: "premium" },
    create: {
      name: "Premium",
      slug: "premium",
      price: 97.90,
      intervalDays: 30,
      aiCreditsPerWeek: 999,
      features: [
        "Tudo do Essencial",
        "Mentoria IA ilimitada",
        "Mentores por banca",
        "Flashcards e notas",
        "Suporte prioritário",
      ],
    },
    update: {},
  });

  console.log("✅ Planos criados");

  // Agentes por área
  for (const [i, area] of CATEGORIAS.entries()) {
    await prisma.agent.upsert({
      where: { slug: `area-${area.id}` },
      create: {
        name: `Mentor de ${area.label}`,
        slug: `area-${area.id}`,
        description: `Especialista em ${area.label} para concursos`,
        area: area.id,
        banca: null,
        systemPrompt: buildAgentSystemPrompt(area.id),
        color: COLORS[i % COLORS.length],
        isPremium: false,
      },
      update: {},
    });
  }

  console.log("✅ Agentes por área criados");

  // Agentes por banca
  for (const [i, banca] of BANCAS.entries()) {
    await prisma.agent.upsert({
      where: { slug: `banca-${banca.id}` },
      create: {
        name: `Especialista ${banca.label}`,
        slug: `banca-${banca.id}`,
        description: `Domina o estilo e as pegadinhas da ${banca.label}`,
        area: null,
        banca: banca.id,
        systemPrompt: buildAgentSystemPrompt(undefined, banca.id),
        color: COLORS[(i + 3) % COLORS.length],
        isPremium: true,
      },
      update: {},
    });
  }

  console.log("✅ Agentes por banca criados");
  console.log("🎉 Seed concluído!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
