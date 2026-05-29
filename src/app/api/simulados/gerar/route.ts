import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { simuladoLimiter } from "@/lib/rate-limit";


export interface QuestaoGerada {
  materia: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string;
  level: "facil" | "medio" | "dificil";
  dicaBanca: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Burst protection: 3 simulados/min por usuário
    const rl = await simuladoLimiter.check(dbUser.id);
    if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

    const body = await req.json() as {
      materias: string[];
      qtd: number;
      cargo?: string;
      nivel?: "facil" | "medio" | "dificil" | "misto";
    };

    const { materias, qtd = 10, cargo, nivel = "misto" } = body;

    if (!materias?.length) {
      return NextResponse.json({ error: "Matérias são obrigatórias." }, { status: 400 });
    }

    const systemPrompt = `Você é um especialista em elaboração de questões de concursos públicos brasileiros.

CARGO ALVO: ${cargo ?? "Concurso Público Geral"}
NÍVEL: ${nivel === "misto" ? "variado (mix de fácil, médio e difícil)" : nivel}
MATÉRIAS: ${materias.join(", ")}
QUANTIDADE: ${qtd} questões

INSTRUÇÕES:
1. Crie questões de múltipla escolha com 5 alternativas (A, B, C, D, E) no padrão de concursos públicos brasileiros
2. Distribua as questões pelas matérias proporcionalmente
3. Varie o nível de dificuldade conforme solicitado
4. Cada questão deve ter uma explicação didática e precisa
5. A dicaBanca deve trazer uma dica ou insight importante sobre o tema da questão
6. As alternativas incorretas (distratores) devem ser plausíveis mas claramente erradas para quem sabe o conteúdo

FORMATO JSON OBRIGATÓRIO (array de questões):
[
  {
    "materia": "Nome da matéria",
    "statement": "Enunciado completo da questão",
    "optionA": "Alternativa A",
    "optionB": "Alternativa B",
    "optionC": "Alternativa C",
    "optionD": "Alternativa D",
    "optionE": "Alternativa E",
    "answer": "A",
    "explanation": "Explicação detalhada e didática da resposta correta",
    "level": "facil|medio|dificil",
    "dicaBanca": "Dica ou insight importante sobre o tema desta questão"
  }
]

Retorne APENAS o JSON (array), sem texto antes ou depois.`;

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 8000,
      systemPrompt,
      messages: [{ role: "user", content: `Gere ${qtd} questões de concurso público para ${cargo ?? "concurso geral"}.` }],
      cacheSystem: true,
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Falha ao gerar questões." }, { status: 500 });
    }

    const questoes = JSON.parse(jsonMatch[0]) as QuestaoGerada[];

    // Salva no histórico de simulados
    const { data: saved } = await db.from("SimuladoHistory").insert({
      userId: dbUser.id,
      total: questoes.length,
      correct: 0,
      timeSecs: 0,
      subjectIds: materias,
      createdAt: new Date().toISOString(),
    }).select("id").single();

    return NextResponse.json({
      id: saved?.id ?? null,
      questoes,
      materias,
      geradoEm: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
