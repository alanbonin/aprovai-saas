import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { defaultAiLimiter } from "@/lib/rate-limit";
import { resolveCargoId } from "@/lib/cargos";
import { getMateriasParaCargo } from "@/lib/materias-por-cargo";

const NOTE_PREFIX = "__DIAGNOSTICO_SEMANAL__";

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ── GET — retorna diagnóstico da semana atual (cached) ───────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const weekKey = getWeekKey();
  const cacheKey = `${NOTE_PREFIX}:${weekKey}:${profileId ?? "global"}`;

  // Tenta retornar diagnóstico já gerado esta semana
  const { data: cached } = await db
    .from("Note")
    .select("content, updatedAt")
    .eq("userId", dbUser.id)
    .eq("subjectId", cacheKey)
    .maybeSingle();

  if (cached?.content) {
    try {
      return NextResponse.json({ ...JSON.parse(cached.content), cached: true, generatedAt: cached.updatedAt });
    } catch { /* regenera */ }
  }

  return NextResponse.json({ diagnostico: null });
}

// ── POST — gera novo diagnóstico semanal com IA ──────────────────────────────
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const rl = await defaultAiLimiter.check(dbUser.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const { start, end } = getWeekBounds();

  // ── Coleta dados da semana ─────────────────────────────────────────────────
  const [
    { count: questoesCount },
    { data: progressRows },
    { count: simCount },
    { data: pomodoroNotes },
    { data: profile },
  ] = await Promise.all([
    (profileId
      ? db.from("Progress").select("id", { count: "exact", head: true }).eq("userId", dbUser.id).eq("profileId", profileId).gte("createdAt", start).lte("createdAt", end)
      : db.from("Progress").select("id", { count: "exact", head: true }).eq("userId", dbUser.id).gte("createdAt", start).lte("createdAt", end)
    ) as unknown as Promise<{ count: number }>,
    profileId
      ? db.from("Progress").select("correct, Subject(name)").eq("userId", dbUser.id).eq("profileId", profileId).gte("createdAt", start).lte("createdAt", end)
      : db.from("Progress").select("correct, Subject(name)").eq("userId", dbUser.id).gte("createdAt", start).lte("createdAt", end),
    db.from("SimuladoHistory").select("id", { count: "exact", head: true })
      .eq("userId", dbUser.id).gte("createdAt", start).lte("createdAt", end) as unknown as Promise<{ count: number }>,
    db.from("Note").select("content")
      .eq("userId", dbUser.id).eq("subjectId", "__POMODORO_SESSION__")
      .gte("createdAt", start).lte("createdAt", end),
    Promise.resolve({ data: activeProfile }),
  ]);

  const totalQuestoes = questoesCount ?? 0;
  const rows = progressRows ?? [];
  const totalCorretas = rows.filter(r => r.correct).length;
  const accuracy = totalQuestoes > 0 ? Math.round((totalCorretas / totalQuestoes) * 100) : 0;
  const pomodoroMin = (pomodoroNotes ?? []).reduce((sum, n) => {
    try { return sum + ((JSON.parse(n.content) as { durMin?: number }).durMin ?? 0); } catch { return sum; }
  }, 0);
  const horasEstudo = +(pomodoroMin / 60).toFixed(1);

  // Agrupa por matéria
  const materiaMap: Record<string, { total: number; correct: number }> = {};
  for (const r of rows) {
    const nome = (r.Subject as { name?: string } | null)?.name ?? "Sem matéria";
    if (!materiaMap[nome]) materiaMap[nome] = { total: 0, correct: 0 };
    materiaMap[nome].total++;
    if (r.correct) materiaMap[nome].correct++;
  }

  const materiaStats = Object.entries(materiaMap)
    .map(([nome, { total, correct: c }]) => ({
      nome,
      total,
      acertos: c,
      pct: total > 0 ? Math.round((c / total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct); // ordenado do pior para o melhor

  const daysToProva = profile?.dataProva
    ? Math.max(0, Math.ceil((new Date(profile.dataProva).getTime() - Date.now()) / 86400000))
    : null;

  if (totalQuestoes === 0) {
    return NextResponse.json({
      diagnostico: {
        titulo: "Comece sua semana de estudos! 🚀",
        resumo: "Você ainda não respondeu questões esta semana. Acesse o workspace e comece agora — cada questão conta!",
        pontoForte: null,
        pontoFraco: null,
        recomendacao: "Tente responder pelo menos 10 questões hoje para ter dados suficientes para o diagnóstico.",
        emoji: "🎯",
        nivel: "inicio",
      },
      stats: { totalQuestoes, accuracy, horasEstudo, simulados: simCount ?? 0 },
    });
  }

  const DIAG_SYSTEM = "Você é a Estrategista Aprovai — especialista em pedagogia para concursos públicos. Sua função é analisar o desempenho semanal do aluno e gerar um diagnóstico personalizado, motivador e acionável.";

  // Resolve matérias exatas do edital pelo cargo
  const resolvedCargo = profile?.cargo
    ? resolveCargoId(profile.cargo, profile.orgao ?? "")
    : null;
  const materiasEdital = resolvedCargo
    ? getMateriasParaCargo(resolvedCargo.cargoId, resolvedCargo.estado)
    : [];

  const prompt = `Analise o desempenho desta semana do aluno e gere um diagnóstico conciso:

CARGO ALVO: ${profile?.cargo ?? "Concurso público"} | ÓRGÃO: ${profile?.orgao ?? "N/A"}
${materiasEdital.length > 0 ? `MATÉRIAS DO EDITAL: ${materiasEdital.join(", ")}` : ""}
${daysToProva !== null ? `DIAS PARA A PROVA: ${daysToProva}` : ""}

DADOS DA SEMANA:
- Questões respondidas: ${totalQuestoes}
- Taxa de acerto geral: ${accuracy}%
- Horas de estudo (Pomodoro): ${horasEstudo}h
- Simulados feitos: ${simCount ?? 0}

DESEMPENHO POR MATÉRIA (do pior para o melhor):
${materiaStats.slice(0, 6).map(m => `- ${m.nome}: ${m.pct}% (${m.acertos}/${m.total})`).join("\n")}

Gere um diagnóstico no formato JSON:
{
  "titulo": "frase curta motivadora (máx 8 palavras)",
  "resumo": "análise em 2 frases (40-60 palavras) do desempenho geral desta semana",
  "pontoForte": "a matéria/aspecto em que o aluno se destacou esta semana (null se não há dados)",
  "pontoFraco": "a matéria/aspecto que mais precisa de atenção (null se não há dados)",
  "recomendacao": "1 ação específica e concreta para a próxima semana (20-35 palavras)",
  "emoji": "1 emoji representando o status geral (🏆, 📈, ⚠️, 🔥, 💪, 🎯, 📚, etc.)",
  "nivel": "excelente|bom|regular|atencao"
}

Retorne APENAS o JSON válido.`;

  const response = await createWithCache({
    model: MODELS.haiku,
    maxTokens: 400,
    systemPrompt: DIAG_SYSTEM,
    cacheSystem: true,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "{}";
  let diagnostico: Record<string, unknown>;
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    diagnostico = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch {
    return NextResponse.json({ error: "Falha ao gerar diagnóstico" }, { status: 500 });
  }

  const result = {
    diagnostico,
    stats: { totalQuestoes, accuracy, horasEstudo, simulados: simCount ?? 0 },
    materiaStats: materiaStats.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };

  // Salva no cache da semana (por perfil)
  const weekKey = getWeekKey();
  const cacheKey = `${NOTE_PREFIX}:${weekKey}:${profileId ?? "global"}`;
  const { data: existing } = await db.from("Note").select("id").eq("userId", dbUser.id).eq("subjectId", cacheKey).maybeSingle();
  if (existing) {
    await db.from("Note").update({ content: JSON.stringify(result), updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(), userId: dbUser.id, subjectId: cacheKey,
      content: JSON.stringify(result),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(result);
}
