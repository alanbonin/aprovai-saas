import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";


export interface DaySchedule {
  dia: string;
  materias: { nome: string; horas: number; prioridade: "alta" | "media" | "baixa"; dica: string }[];
  totalHoras: number;
  folga?: boolean;
}

export interface Cronograma {
  semana: DaySchedule[];
  resumo: string;
  metaSemanal: string;
  horasTotais: number;
  geradoEm: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as { horasPorDia?: number; diasDisp?: string[] };
    const horasPorDia = body.horasPorDia ?? 3;
    const diasDisp = body.diasDisp ?? ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    // Busca perfil
    const { data: profile } = await db
      .from("StudentProfile")
      .select("cargo, orgao, dataProva, dificuldades")
      .eq("userId", dbUser.id)
      .single();

    // Busca matérias do aluno
    const { data: studentSubjects } = await db
      .from("StudentSubject")
      .select("Subject(id, name)")
      .eq("userId", dbUser.id);

    const materias = (studentSubjects ?? [])
      .map((ss: { Subject: unknown }) => {
        const s = ss.Subject as { name: string }[] | { name: string } | null;
        return Array.isArray(s) ? s[0]?.name : (s as { name: string } | null)?.name;
      })
      .filter(Boolean) as string[];

    // Calcula dias para a prova
    let diasProva: number | null = null;
    if (profile?.dataProva) {
      diasProva = Math.max(0, Math.ceil(
        (new Date(profile.dataProva).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ));
    }

    const systemPrompt = `Você é um estrategista especializado em concursos públicos brasileiros.
Gere um cronograma semanal de estudos PERSONALIZADO e DETALHADO no formato JSON.

PERFIL DO ALUNO:
- Cargo/Órgão: ${profile?.cargo ?? "não informado"} / ${profile?.orgao ?? "não informado"}
- Dias para prova: ${diasProva !== null ? diasProva + " dias" : "não informado"}
- Dificuldades: ${profile?.dificuldades ?? "não informado"}
- Matérias: ${materias.length > 0 ? materias.join(", ") : "gerais do concurso (Direito Constitucional, Administrativo, Português, Raciocínio Lógico)"}
- Horas disponíveis por dia: ${horasPorDia}h
- Dias disponíveis: ${diasDisp.join(", ")}

REGRAS PEDAGÓGICAS:
1. Distribua as matérias estrategicamente — não repita a mesma matéria no mesmo dia
2. Matérias mais cobradas em concursos públicos (Direito Administrativo, Constitucional, Português) têm maior carga
3. Intercale matérias difíceis com mais fáceis no mesmo dia
4. Reserve tempo para questões e revisão (pelo menos 1 dia por semana)
5. Se diasProva < 30: foco em revisão rápida + simulados
6. Se diasProva < 7: apenas revisão de pontos críticos
7. Para cada matéria, uma dica PRÁTICA e específica para aquele dia

FORMATO JSON (retorne APENAS o JSON, sem texto antes ou depois):
{
  "semana": [
    {
      "dia": "Segunda",
      "materias": [
        {
          "nome": "Direito Administrativo",
          "horas": 1.5,
          "prioridade": "alta",
          "dica": "Foque nos princípios da Adm. Pública (LIMPE) — resolva 10 questões do Art. 37 CF/88"
        }
      ],
      "totalHoras": 3.0,
      "folga": false
    }
  ],
  "resumo": "Frase motivadora personalizada sobre o cronograma desta semana",
  "metaSemanal": "Objetivo específico e mensurável para a semana",
  "horasTotais": 18
}`;

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 3000,
      systemPrompt,
      messages: [{ role: "user", content: "Gere meu cronograma semanal personalizado." }],
      cacheSystem: true,
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Falha ao gerar cronograma" }, { status: 500 });
    }

    const cronograma = JSON.parse(jsonMatch[0]) as Cronograma;
    cronograma.geradoEm = new Date().toISOString();

    return NextResponse.json({ cronograma });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
