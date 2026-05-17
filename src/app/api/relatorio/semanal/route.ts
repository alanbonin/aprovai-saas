import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";

const CACHE_PREFIX = "__RESUMO_SEMANAL__";

interface WeeklyDigest {
  weekKey: string;
  generatedAt: string;
  questoesRespondidas: number;
  questoesCorretas: number;
  aproveitamento: number;
  streakAtual: number;
  xpGanho: number;
  melhorMateria: string | null;
  piorMateria: string | null;
  tendencia: "subindo" | "estavel" | "caindo";
  titulo: string;
  paragrafo: string;
  destaques: string[];
  proximasSemana: string[];
  emoji: string;
}

function getWeekKey() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // domingo
  return d.toISOString().slice(0, 10);
}

function getWeekStart(weeksAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const SYSTEM = `Você é um coach de estudos para concursos públicos brasileiros.
Analise os dados de desempenho semanal do aluno e gere um resumo motivador e preciso.
Seja direto, objetivo e use português brasileiro informal mas profissional.
Responda APENAS com JSON válido.`;

/**
 * GET /api/relatorio/semanal
 * Retorna o resumo semanal do aluno (cache de 6 horas).
 *
 * POST /api/relatorio/semanal
 * Força a regeneração do resumo ignorando o cache.
 */
export async function GET() {
  return handler(false);
}

export async function POST() {
  return handler(true);
}

async function handler(forceRegenerate: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const weekKey = getWeekKey();

  // Tenta retornar do cache (válido por 6 horas)
  if (!forceRegenerate) {
    const { data: cached } = await db.from("Note").select("content, updatedAt")
      .eq("userId", dbUser.id).eq("subjectId", CACHE_PREFIX).single();

    if (cached?.content) {
      try {
        const digest = JSON.parse(cached.content) as WeeklyDigest;
        if (digest.weekKey === weekKey) {
          const age = Date.now() - new Date(cached.updatedAt as string).getTime();
          if (age < 6 * 3600 * 1000) {
            return NextResponse.json({ digest, cached: true });
          }
        }
      } catch { /* regenera */ }
    }
  }

  // Coleta dados da semana atual e anterior
  const thisWeekStart  = getWeekStart(0);
  const lastWeekStart  = getWeekStart(1);
  const lastWeekEnd    = thisWeekStart;

  const [progressThisWeek, progressLastWeek, profile, subjectStats] = await Promise.all([
    db.from("Progress").select("correct, questionId").eq("userId", dbUser.id).gte("createdAt", thisWeekStart),
    db.from("Progress").select("correct").eq("userId", dbUser.id).gte("createdAt", lastWeekStart).lt("createdAt", lastWeekEnd),
    db.from("StudentProfile").select("streak, xp, cargo").eq("userId", dbUser.id).single(),
    db.from("Progress")
      .select("correct, Question:questionId(subjectId, Subject:subjectId(name))")
      .eq("userId", dbUser.id)
      .gte("createdAt", thisWeekStart),
  ]);

  const thisWeek = progressThisWeek.data ?? [];
  const lastWeek = progressLastWeek.data ?? [];

  const questoesRespondidas = thisWeek.length;
  const questoesCorretas    = thisWeek.filter(p => p.correct).length;
  const aproveitamento      = questoesRespondidas > 0 ? Math.round((questoesCorretas / questoesRespondidas) * 100) : 0;

  const lastWeekAproveitamento = lastWeek.length > 0
    ? Math.round((lastWeek.filter(p => p.correct).length / lastWeek.length) * 100)
    : null;

  const tendencia: WeeklyDigest["tendencia"] =
    lastWeekAproveitamento === null ? "estavel"
    : aproveitamento > lastWeekAproveitamento + 5 ? "subindo"
    : aproveitamento < lastWeekAproveitamento - 5 ? "caindo"
    : "estavel";

  // Agrupa por matéria para identificar melhor/pior
  const subjectMap: Record<string, { name: string; total: number; correct: number }> = {};
  for (const p of subjectStats.data ?? []) {
    const q = Array.isArray(p.Question) ? p.Question[0] : p.Question as { subjectId?: string; Subject?: { name: string }[] | { name: string } } | null;
    if (!q?.subjectId) continue;
    const subj = Array.isArray(q.Subject) ? q.Subject[0] : q.Subject as { name?: string } | null;
    const name = subj?.name ?? "Outras";
    if (!subjectMap[q.subjectId]) subjectMap[q.subjectId] = { name, total: 0, correct: 0 };
    subjectMap[q.subjectId].total++;
    if (p.correct) subjectMap[q.subjectId].correct++;
  }

  const subjectArr = Object.values(subjectMap).filter(s => s.total >= 3);
  subjectArr.sort((a, b) => (b.correct / b.total) - (a.correct / a.total));
  const melhorMateria = subjectArr[0]?.name ?? null;
  const piorMateria   = subjectArr[subjectArr.length - 1]?.name ?? null;

  const streak = profile.data?.streak ?? 0;
  const cargo  = profile.data?.cargo ?? "concurso público";

  // Se não há dados suficientes, retorna resumo sem IA
  if (questoesRespondidas < 3) {
    const digest: WeeklyDigest = {
      weekKey, generatedAt: new Date().toISOString(),
      questoesRespondidas, questoesCorretas, aproveitamento, streakAtual: streak,
      xpGanho: questoesCorretas * 2,
      melhorMateria, piorMateria, tendencia,
      titulo: "Comece sua semana de estudos! 🚀",
      paragrafo: "Você ainda não respondeu questões suficientes esta semana. Acesse o Estudar e comece agora para gerar seu resumo personalizado.",
      destaques: [],
      proximasSemana: ["Responda pelo menos 10 questões para gerar seu resumo semanal"],
      emoji: "📊",
    };
    return NextResponse.json({ digest, cached: false });
  }

  // Gera resumo com IA
  const prompt = `Dados do aluno esta semana:
- Questões respondidas: ${questoesRespondidas}
- Questões corretas: ${questoesCorretas}
- Aproveitamento: ${aproveitamento}%
- Aproveitamento semana passada: ${lastWeekAproveitamento !== null ? `${lastWeekAproveitamento}%` : "sem dados"}
- Tendência: ${tendencia}
- Streak atual: ${streak} dias
- Melhor matéria: ${melhorMateria ?? "N/A"}
- Pior matéria: ${piorMateria ?? "N/A"}
- Preparando para: ${cargo}

Gere um resumo semanal motivador. Responda com JSON:
{
  "titulo": "título curto e motivador (máx 60 chars)",
  "paragrafo": "resumo em 2-3 frases sobre a semana, mencionando os números reais",
  "destaques": ["2-3 pontos positivos da semana"],
  "proximasSemana": ["2-3 recomendações específicas para a próxima semana, baseadas nos dados"],
  "emoji": "1 emoji que resume a semana"
}`;

  let aiResult: Pick<WeeklyDigest, "titulo" | "paragrafo" | "destaques" | "proximasSemana" | "emoji">;

  try {
    const res = await createWithCache({
      model: MODELS.haiku, maxTokens: 500, cacheSystem: false,
      systemPrompt: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find(b => b.type === "text")?.text ?? "{}";
    aiResult = extractJSON(text);
    if (!aiResult.titulo) throw new Error("inválido");
  } catch {
    aiResult = {
      titulo: `${aproveitamento}% de aproveitamento esta semana`,
      paragrafo: `Você respondeu ${questoesRespondidas} questões com ${aproveitamento}% de aproveitamento. ${tendencia === "subindo" ? "Tendência de melhora!" : tendencia === "caindo" ? "Foque na revisão dos erros." : "Desempenho estável."}`,
      destaques: streak > 0 ? [`${streak} dias de sequência mantidos`] : [],
      proximasSemana: piorMateria ? [`Reforçar ${piorMateria}`] : ["Continue praticando questões"],
      emoji: aproveitamento >= 70 ? "🏆" : aproveitamento >= 50 ? "📈" : "💪",
    };
  }

  const digest: WeeklyDigest = {
    weekKey, generatedAt: new Date().toISOString(),
    questoesRespondidas, questoesCorretas, aproveitamento,
    streakAtual: streak, xpGanho: questoesCorretas * 2,
    melhorMateria, piorMateria, tendencia,
    ...aiResult,
  };

  // Salva no cache
  const content = JSON.stringify(digest);
  const { data: existing } = await db.from("Note").select("id")
    .eq("userId", dbUser.id).eq("subjectId", CACHE_PREFIX).single();

  if (existing?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(), userId: dbUser.id, subjectId: CACHE_PREFIX, content,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ digest, cached: false });
}
