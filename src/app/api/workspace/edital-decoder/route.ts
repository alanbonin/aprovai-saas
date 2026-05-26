import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";


export interface MateriaExtraida {
  nome: string;
  peso: number;           // 1-5 (importância relativa)
  topicos: string[];      // subtópicos principais
  horas: number;          // horas semanais sugeridas
  prioridade: "alta" | "media" | "baixa";
  dicaBanca: string;      // dica específica da banca
}

export interface EditalResult {
  cargo: string;
  orgao: string;
  banca: string;
  dataProva: string | null;
  materias: MateriaExtraida[];
  totalHorasSemana: number;
  resumo: string;
  planoSugerido: string;
}

// ── PUT — adiciona matérias extraídas ao plano do aluno ─────────────────────
export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as { materias: { nome: string }[] };
    const nomes = body.materias.map((m: { nome: string }) => m.nome);

    // Busca subjects que batem por nome (case-insensitive, parcial)
    const { data: allSubjects } = await db.from("Subject").select("id, name, slug");
    const matched: string[] = [];
    for (const nome of nomes) {
      const nomeNorm = nome.toLowerCase().trim();
      const subject = (allSubjects ?? []).find((s: { name: string }) =>
        s.name.toLowerCase().includes(nomeNorm.slice(0, 6)) ||
        nomeNorm.includes(s.name.toLowerCase().slice(0, 6))
      );
      if (subject) matched.push(subject.id);
    }

    // Busca StudentSubjects existentes para não duplicar
    const { data: existing } = await db
      .from("StudentSubject").select("subjectId").eq("userId", dbUser.id);
    const existingIds = new Set((existing ?? []).map((ss: { subjectId: string }) => ss.subjectId));

    const toAdd = matched.filter(id => !existingIds.has(id));
    if (toAdd.length > 0) {
      const now = new Date().toISOString();
      await db.from("StudentSubject").insert(
        toAdd.map(subjectId => ({
          id: crypto.randomUUID(),
          userId: dbUser.id,
          subjectId,
          fromEdital: true,
          createdAt: now,
        }))
      );
    }

    return NextResponse.json({ added: toAdd.length, matched: matched.length });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ── POST — analisa texto do edital com IA ────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as { texto: string };
    if (!body.texto?.trim()) {
      return NextResponse.json({ error: "Texto do edital não informado." }, { status: 400 });
    }

    // Limita o texto para não explodir o contexto
    const textoTruncado = body.texto.trim().slice(0, 12000);

    const systemPrompt = `Você é um especialista em análise de editais de concursos públicos brasileiros.
Analise o texto do edital/conteúdo programático e extraia as informações no formato JSON.

REGRAS DE EXTRAÇÃO:
1. Identifique TODAS as disciplinas/matérias listadas
2. Para cada matéria, estime o peso (1=baixo, 5=altíssimo) baseado em:
   - Número de questões mencionadas
   - Quantidade de tópicos
   - Posição no edital (primeiras matérias geralmente têm mais peso)
3. Liste os subtópicos principais de cada matéria (máx. 6)
4. Estime horas semanais proporcionais ao peso
5. Classifique prioridade: alta (peso 4-5), media (peso 3), baixa (peso 1-2)
6. Dê uma dica específica da banca se identificada (ex: "CESPE cobra muito o Art. 37 CF")
7. Tente extrair cargo, órgão, banca e data da prova do texto

FORMATO JSON OBRIGATÓRIO (retorne APENAS JSON, sem texto adicional):
{
  "cargo": "Nome do cargo extraído ou 'Não identificado'",
  "orgao": "Órgão/instituição ou 'Não identificado'",
  "banca": "Banca ou 'Não identificada'",
  "dataProva": "YYYY-MM-DD ou null",
  "materias": [
    {
      "nome": "Nome oficial da disciplina",
      "peso": 4,
      "topicos": ["Tópico 1", "Tópico 2", "..."],
      "horas": 6,
      "prioridade": "alta",
      "dicaBanca": "Dica específica para este concurso/banca"
    }
  ],
  "totalHorasSemana": 20,
  "resumo": "Análise sucinta do edital em 2 frases",
  "planoSugerido": "Estratégia de estudos personalizada em 3-4 frases"
}`;

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 4000,
      systemPrompt,
      cacheSystem: true,
      messages: [{ role: "user", content: `Analise este edital:\n\n${textoTruncado}` }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Falha ao analisar o edital." }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]) as EditalResult;
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
