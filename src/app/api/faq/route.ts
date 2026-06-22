import { NextResponse } from "next/server";

export const runtime = "edge";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Rota pública — NUNCA usar SERVICE_ROLE_KEY (bypassa RLS)
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function getPlans() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Plan?select=name,slug,price,intervalDays,billingCycle,features,aiCreditsPerWeek,maxQuestionsPerWeek,maxSimuladosPerWeek,hasPdfLibrary,hasArena,hasAdaptativo,hasCompanhia&active=eq.true&order=price.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, next: { revalidate: 300 } }
    );
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

async function getStats() {
  try {
    const [qRes, tRes, uRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/Question?select=id&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "count=exact", Range: "0-0" },
        next: { revalidate: 3600 }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/Topic?select=id&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "count=exact", Range: "0-0" },
        next: { revalidate: 3600 }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/User?select=id&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "count=exact", Range: "0-0" },
        next: { revalidate: 3600 }
      }),
    ]);
    const parseCount = (h: Headers) => parseInt(h.get("content-range")?.split("/")[1] ?? "0");
    return {
      questoes: parseCount(qRes.headers),
      topicos: parseCount(tRes.headers),
      usuarios: parseCount(uRes.headers),
    };
  } catch { return { questoes: 325000, topicos: 1100, usuarios: 0 }; }
}

export async function GET() {
  const [plans, stats] = await Promise.all([getPlans(), getStats()]);

  const activePlans = plans.filter((p: { slug: string }) => !p.slug.includes("deprecado") && !p.slug.includes("trial"));
  const trial = plans.find((p: { slug: string }) => p.slug === "trial");

  const APP_URL = "https://aprovai360.com.br";
  const SUPORTE_URL = "https://aprovai360.com.br/suporte";

  const faq = [
    {
      pergunta: "Como faço para me cadastrar?",
      resposta: `Acesse ${APP_URL} e clique em 'Começar Grátis'. O cadastro leva menos de 1 minuto e não precisa de cartão de crédito.`,
    },
    {
      pergunta: "Tem período gratuito?",
      resposta: "Sim! O Trial Gratuito dá 7 dias de acesso sem precisar de cartão de crédito.",
    },
    {
      pergunta: "Quais planos estão disponíveis?",
      resposta: activePlans.map((p: { name: string; price: number; billingCycle: string }) =>
        `${p.name}: R$ ${p.price},00/${p.billingCycle === "ANNUAL" ? "ano" : "mês"}`
      ).join(" | "),
    },
    {
      pergunta: "Como funciona o mentor IA?",
      resposta: "O mentor IA é especializado por área do conhecimento e banca. Você pode tirar dúvidas, pedir explicações, criar planos de estudo e receber correções personalizadas.",
    },
    {
      pergunta: "Quantas questões tem no banco?",
      resposta: `Mais de ${stats.questoes.toLocaleString("pt-BR")} questões reais de provas anteriores, organizadas por matéria, banca e edital.`,
    },
    {
      pergunta: "Funciona para qual concurso?",
      resposta: "Para qualquer concurso público federal, estadual ou municipal. A plataforma também atende ENEM, Vestibular, OAB, REVALIDA e CFC.",
    },
    {
      pergunta: "Como cancelo minha assinatura?",
      resposta: "Acesse Configurações dentro da plataforma e clique em 'Cancelar assinatura'. O acesso continua até o fim do período pago.",
    },
    {
      pergunta: "Tem aplicativo?",
      resposta: `Sim! O AprovAI360 é um PWA (Progressive Web App). No celular, acesse ${APP_URL} pelo navegador e instale direto na tela inicial — funciona como app nativo sem precisar de loja.`,
    },
    {
      pergunta: "O simulado da OAB tem o formato oficial?",
      resposta: "Sim. O simulado modo OAB tem 80 questões, 5 horas de duração e exige 50% de aproveitamento, igual ao exame real.",
    },
    {
      pergunta: "Como funciona o pagamento?",
      resposta: "Aceitamos cartão de crédito e PIX via Mercado Pago. O pagamento é seguro e processado diretamente pela plataforma.",
    },
    {
      pergunta: "Posso estudar para mais de um concurso?",
      resposta: "Depende do plano. Focado: 1 concurso. Aprovação: até 2. Elite: até 5 concursos simultâneos.",
    },
    {
      pergunta: "Como entro em contato com o suporte?",
      resposta: `Acesse ${SUPORTE_URL} ou responda este chat. Nosso time responde em até 24h úteis.`,
    },
    {
      pergunta: "A plataforma é segura? Como tratam meus dados?",
      resposta: `Sim. Seguimos a LGPD (Lei 13.709/2018). Seus dados são protegidos e você pode solicitar exportação ou exclusão a qualquer momento em Configurações. Mais detalhes em ${APP_URL}/privacidade`,
    },
  ];

  const data = {
    plataforma: {
      nome: "AprovAI360",
      url: APP_URL,
      descricao: "Plataforma de estudos para concursos públicos com mentores IA especializados por área e banca.",
      suporte: SUPORTE_URL,
      modalidades: ["Concurso Público", "ENEM", "Vestibular", "OAB", "REVALIDA", "CFC"],
    },
    estatisticas: {
      questoes: stats.questoes,
      topicos: stats.topicos,
      usuarios: stats.usuarios,
    },
    trial: trial ? {
      nome: trial.name,
      duracao: `${trial.intervalDays} dias`,
      preco: "Grátis",
      cartao_necessario: false,
      limite_questoes_semana: trial.maxQuestionsPerWeek,
      creditos_ia_semana: trial.aiCreditsPerWeek,
    } : null,
    planos: activePlans.map((p: {
      name: string; slug: string; price: number; intervalDays: number;
      billingCycle: string; features: string[]; aiCreditsPerWeek: number;
      maxQuestionsPerWeek: number; maxSimuladosPerWeek: number;
      hasPdfLibrary: boolean; hasArena: boolean; hasAdaptativo: boolean; hasCompanhia: boolean;
    }) => ({
      nome: p.name,
      slug: p.slug,
      preco: p.billingCycle === "ANNUAL"
        ? `R$ ${p.price},00/ano (${Math.round(p.price / 12)}x/mês)`
        : `R$ ${p.price},00/mês`,
      ciclo: p.billingCycle === "ANNUAL" ? "Anual" : "Mensal",
      creditos_ia_semana: p.aiCreditsPerWeek === -1 || p.aiCreditsPerWeek >= 9999 ? "Ilimitado" : p.aiCreditsPerWeek,
      questoes_semana: p.maxQuestionsPerWeek === -1 ? "Ilimitado" : p.maxQuestionsPerWeek,
      simulados_semana: p.maxSimuladosPerWeek === -1 ? "Ilimitado" : p.maxSimuladosPerWeek,
      redacoes_semana: p.maxRedacoesPerWeek === -1 ? "Ilimitado" : p.maxRedacoesPerWeek,
      casos_semana: p.maxCasosPerWeek === -1 ? "Ilimitado" : p.maxCasosPerWeek,
      biblioteca_pdf: p.hasPdfLibrary,
      arena: p.hasArena,
      modo_adaptativo: p.hasAdaptativo,
      modo_companhia: p.hasCompanhia,
      recursos: p.features,
    })),
    faq,
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
