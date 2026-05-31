import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";

const DIAS_PT = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];

// Tipos de tarefa disponíveis
export type TarefaTipo =
  | "questoes" | "desafio" | "quiz" | "desafio_semanal"
  | "flashcards" | "revisao" | "pdf"
  | "redacao" | "caso" | "simulado" | "modo_exame";

export interface Tarefa {
  tipo: TarefaTipo;
  desc: string;       // descrição motivacional curta
  urgente?: boolean;  // destaque em laranja
}

export interface PlanoDia {
  tarefas: Tarefa[];
  frase: string;      // frase motivacional do dia
  geradoEm: string;   // YYYY-MM-DD BRT
}

const SYSTEM = "Você é um coach de estudos para concursos públicos. Responda APENAS com JSON válido.";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const todayStr = brtNow.toISOString().slice(0, 10);
  const diaSemana = DIAS_PT[brtNow.getDay()];

  // Verifica cache (Note __PLANO_DIA__:data)
  const cacheKey = `__PLANO_DIA__:${todayStr}`;
  const { data: cached } = await db.from("Note").select("content")
    .eq("userId", dbUser.id).eq("subjectId", cacheKey).maybeSingle();

  if (cached?.content) {
    try {
      return NextResponse.json(JSON.parse(cached.content) as PlanoDia);
    } catch { /* regenera */ }
  }

  // Busca contexto do aluno
  const [profileRes, statsRes, revisaoRes, flashRes, semanaRes] = await Promise.all([
    db.from("StudentProfile").select("streak, horasEstudo").eq("userId", dbUser.id).maybeSingle(),
    db.from("Progress").select("correct", { count: "exact" }).eq("userId", dbUser.id)
      .gte("createdAt", new Date(brtNow.getFullYear(), brtNow.getMonth(), brtNow.getDate()).toISOString()),
    db.from("Progress").select("id", { count: "exact" }).eq("userId", dbUser.id)
      .lte("nextReview", brtNow.toISOString()).not("nextReview", "is", null),
    db.from("FlashcardSet").select("cards").eq("userId", dbUser.id),
    db.from("WeeklyUsage").select("resource, count").eq("userId", dbUser.id)
      .in("resource", ["redacao","caso"]),
  ]);

  const activeProfile = await getActiveProfile(dbUser.id);
  const cargo = activeProfile?.cargo ?? "";
  const concurso = (activeProfile as unknown as { concurso?: string })?.concurso ?? "";
  const streak = (profileRes.data?.streak as number) ?? 0;
  const questoesHoje = statsRes.count ?? 0;
  const revisoesPendentes = revisaoRes.count ?? 0;

  let flashcardsPendentes = 0;
  for (const set of flashRes.data ?? []) {
    try {
      const cards = JSON.parse(set.cards as string) as { nextReview?: string }[];
      flashcardsPendentes += cards.filter(c => c.nextReview && c.nextReview <= brtNow.toISOString()).length;
    } catch { /* ignore */ }
  }

  const redacaoSemana = (semanaRes.data ?? []).find(r => r.resource === "redacao");
  const casoSemana = (semanaRes.data ?? []).find(r => r.resource === "caso");
  const redacaoFeita = ((redacaoSemana as { count?: number } | undefined)?.count ?? 0) > 0;
  const casoFeito = ((casoSemana as { count?: number } | undefined)?.count ?? 0) > 0;

  const perfil = cargo ? `${cargo}${concurso ? ` — ${concurso}` : ""}` : "concurseiro em geral";

  const prompt = `Crie o plano de estudos de HOJE (${diaSemana}) para um aluno de concurso público.

PERFIL: ${perfil}
STREAK: ${streak} dias consecutivos
QUESTÕES JÁ FEITAS HOJE: ${questoesHoje}
REVISÕES SM-2 PENDENTES: ${revisoesPendentes}
FLASHCARDS VENCIDOS: ${flashcardsPendentes}
REDAÇÃO ESTA SEMANA: ${redacaoFeita ? "SIM" : "NÃO"}
CASO ESTA SEMANA: ${casoFeito ? "SIM" : "NÃO"}

REGRAS:
- Selecione 4 a 6 tarefas para HOJE baseadas no contexto acima
- SEMPRE inclua "questoes" como primeira tarefa
- Se revisoesPendentes > 0, inclua "revisao" como urgente
- Se flashcardsPendentes > 5, inclua "flashcards"
- "desafio" (diário) deve aparecer quase todo dia
- "redacao" e "caso" só apareçam se não foram feitos esta semana (máx 1x/semana cada)
- "simulado" ou "modo_exame" raramente (1-2x/semana), não em dias com revisao urgente
- "quiz" e "desafio_semanal" aparecem 2-3x/semana
- "pdf" aparece 3-4x/semana para quem tem meta de leitura
- Adapte ao dia da semana: fins de semana podem ter simulado/modo_exame
- desc deve ser motivacional, específica ao cargo, máx 60 chars
- frase deve ser curta (máx 80 chars), motivacional para o dia

Tipos disponíveis: questoes, desafio, quiz, desafio_semanal, flashcards, revisao, pdf, redacao, caso, simulado, modo_exame

Retorne APENAS JSON válido:
{
  "tarefas": [
    { "tipo": "questoes", "desc": "Foque nos seus pontos fracos", "urgente": false },
    { "tipo": "desafio", "desc": "10 questões cronometradas — XP bônus" }
  ],
  "frase": "Cada questão te aproxima da aprovação!"
}`;

  try {
    const msg = await createWithCache({
      model: MODELS.haiku, maxTokens: 600, systemPrompt: SYSTEM, cacheSystem: false,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = extractJSON<{ tarefas: Tarefa[]; frase: string }>(raw);

    const plano: PlanoDia = { tarefas: parsed.tarefas, frase: parsed.frase, geradoEm: todayStr };

    // Salva cache (Note do dia)
    const now = new Date().toISOString();
    const { data: ex } = await db.from("Note").select("id").eq("userId", dbUser.id).eq("subjectId", cacheKey).maybeSingle();
    if (ex?.id) {
      await db.from("Note").update({ content: JSON.stringify(plano), updatedAt: now }).eq("id", ex.id);
    } else {
      await db.from("Note").insert({ id: crypto.randomUUID(), userId: dbUser.id, subjectId: cacheKey, content: JSON.stringify(plano), createdAt: now, updatedAt: now });
    }

    return NextResponse.json(plano);
  } catch {
    // Fallback: plano padrão sem IA
    const fallback: PlanoDia = {
      tarefas: [
        { tipo: "questoes", desc: "Responda questões do seu concurso" },
        { tipo: "desafio", desc: "10 questões cronometradas — XP bônus" },
        ...(revisoesPendentes > 0 ? [{ tipo: "revisao" as TarefaTipo, desc: "Revisões SM-2 vencidas", urgente: true }] : []),
        ...(flashcardsPendentes > 0 ? [{ tipo: "flashcards" as TarefaTipo, desc: "Flashcards para revisar hoje" }] : []),
        { tipo: "pdf", desc: "Leitura de materiais da Biblioteca" },
      ],
      frase: "Foco e consistência levam à aprovação!",
      geradoEm: todayStr,
    };
    return NextResponse.json(fallback);
  }
}
