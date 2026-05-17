import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { simuladoLimiter } from "@/lib/rate-limit";

// ── Perfil de cada banca ──────────────────────────────────────────────────────
const BANCA_PERFIS: Record<string, string> = {
  "CESPE": `Banca CESPE/CEBRASPE:
- Questões CERTO/ERRADO (não múltipla escolha tradicional), 2 opções: C ou E
- Enunciados longos com afirmações que precisam ser julgadas como certas ou erradas
- Frequentemente usa conectivos lógicos (e, ou, se...então) que mudam o sentido da afirmação
- Trechos de leis e doutrinas com pequenas alterações propositais
- Foco em detalhes e exceções, não apenas na regra geral
- Tom formal, acadêmico, com muitas referências legais
- FORMATO: cada questão tem statement + opção A: CERTO, B: ERRADO`,

  "FCC": `Banca FCC (Fundação Carlos Chagas):
- Questões de múltipla escolha com 5 alternativas (A, B, C, D, E)
- Enunciados mais diretos e objetivos que CESPE
- Foco em interpretação literal de legislação
- Alternativas bem elaboradas com distratores plausíveis
- Usa expressões como "é correto afirmar que", "incorreto", "exceto"
- Cobra textos literais de leis, menos interpretação
- Alternativas geralmente simétricas em tamanho`,

  "FGV": `Banca FGV:
- Múltipla escolha com 5 alternativas
- Questões mais elaboradas com casos práticos
- Mistura teoria com aplicação prática
- Enunciados moderados, nem tão longos quanto CESPE
- Alternativas com raciocínio mais complexo
- Costuma testar conceitos e não apenas decoreba
- Boa dose de situações-problema ("Assinale a alternativa que apresenta...")`,

  "VUNESP": `Banca VUNESP:
- Múltipla escolha com 5 alternativas
- Questões moderadas em complexidade
- Foco em legislação estadual paulista além da federal
- Cobra itens de legislação de forma direta
- Frequentemente usa o estilo "Assinale a alternativa CORRETA"
- Inclui questões situacionais com cenários práticos
- Algumas questões de interpretação de texto legal`,

  "AOCP": `Banca AOCP:
- Múltipla escolha com 5 alternativas
- Foco em legislação específica e detalhada
- Questões diretas sobre letra da lei
- Menos questões situacionais, mais de memorização
- Cobra detalhes como prazos, números e percentuais
- Enunciados objetivos e curtos`,

  "IBFC": `Banca IBFC:
- Múltipla escolha com 5 alternativas
- Questões de nível médio, menos elaboradas
- Cobra principalmente a regra geral, raramente exceções
- Enunciados diretos
- Foco em conceitos fundamentais
- Boa parte das questões tem uma resposta claramente correta`,

  "IADES": `Banca IADES:
- Múltipla escolha com 5 alternativas
- Cobra principalmente legislação atualizada
- Foco em situações práticas do dia a dia do cargo
- Questões com grau médio de dificuldade
- Cobra interpretação de texto em português com frequência`,

  "CESGRANRIO": `Banca CESGRANRIO:
- Múltipla escolha com 5 alternativas
- Utilizada principalmente para Petrobras, BNDES, bancos federais
- Questões de nível alto de elaboração
- Cobra muito raciocínio lógico e análise crítica
- Enunciados elaborados com situações complexas
- Distratores muito bem elaborados`,

  "ESAF": `Banca ESAF:
- Múltipla escolha com 5 alternativas
- Foco em finanças públicas, orçamento e administração
- Questões de nível alto
- Cobra detalhes técnicos de legislação tributária e financeira
- Enunciados técnicos e específicos`,
};

const DEFAULT_BANCA_PERFIL = `Banca genérica de concursos públicos brasileiros:
- Múltipla escolha com 5 alternativas (A, B, C, D, E)
- Questões de nível médio
- Cobra legislação e conceitos fundamentais`;

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
  banca: string;
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
    const rl = simuladoLimiter.check(dbUser.id);
    if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

    const body = await req.json() as {
      banca: string;
      materias: string[];
      qtd: number;
      cargo?: string;
      nivel?: "facil" | "medio" | "dificil" | "misto";
    };

    const { banca, materias, qtd = 10, cargo, nivel = "misto" } = body;

    if (!banca || !materias?.length) {
      return NextResponse.json({ error: "Banca e matérias são obrigatórios." }, { status: 400 });
    }

    const bancaPerfil = BANCA_PERFIS[banca.toUpperCase().replace("/", "").split(" ")[0]] ?? DEFAULT_BANCA_PERFIL;
    const isCespe = banca.toUpperCase().includes("CESPE") || banca.toUpperCase().includes("CEBRASPE");

    const systemPrompt = `Você é um especialista em elaboração de questões de concursos públicos.

BANCA:
${bancaPerfil}

CARGO ALVO: ${cargo ?? "Concurso Público Geral"}
NÍVEL: ${nivel === "misto" ? "variado (mix de fácil, médio e difícil)" : nivel}
MATÉRIAS: ${materias.join(", ")}
QUANTIDADE: ${qtd} questões

${isCespe ? `ATENÇÃO CESPE: Gere questões no formato CERTO/ERRADO:
- optionA = "CERTO"
- optionB = "ERRADO"
- optionC, optionD, optionE = null
- answer = "A" (se CERTO) ou "B" (se ERRADO)
- Varie entre questões certas e erradas (aprox. 50% de cada)` : ""}

INSTRUÇÕES:
1. Siga EXATAMENTE o estilo da banca informada
2. Distribua as questões pelas matérias proporcionalmente
3. Varie o nível de dificuldade conforme solicitado
4. Cada questão deve ter uma explicação didática e precisa
5. A dicaBanca deve explicar por que esta questão é característica desta banca
6. As alternativas incorretas (distratores) devem ser plausíveis mas claramente erradas para quem sabe o conteúdo

FORMATO JSON OBRIGATÓRIO (array de questões):
[
  {
    "materia": "Nome da matéria",
    "statement": "Enunciado completo da questão no estilo da banca",
    "optionA": "Alternativa A",
    "optionB": "Alternativa B",
    "optionC": "Alternativa C ou null se CESPE",
    "optionD": "Alternativa D ou null se CESPE",
    "optionE": "Alternativa E ou null se CESPE",
    "answer": "A",
    "explanation": "Explicação detalhada e didática da resposta correta",
    "level": "facil|medio|dificil",
    "banca": "${banca}",
    "dicaBanca": "Por que esta questão é característica desta banca"
  }
]

Retorne APENAS o JSON (array), sem texto antes ou depois.`;

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 8000,
      systemPrompt,
      messages: [{ role: "user", content: `Gere ${qtd} questões de concurso no estilo ${banca}.` }],
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
      createdAt: new Date().toISOString(),
    }).select("id").single();

    return NextResponse.json({
      id: saved?.id ?? null,
      questoes,
      banca,
      materias,
      geradoEm: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
