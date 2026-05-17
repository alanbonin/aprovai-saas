import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { editalLimiter } from "@/lib/rate-limit";

const NOTE_PREFIX = "__EDITAL_WATCH__";


export interface EditalAlerta {
  orgao: string;
  status: "provavelmente_aberto" | "previsto" | "em_andamento" | "sem_info";
  titulo: string;
  descricao: string;
  banca?: string;
  vagas?: string;
  prazo?: string;
  salario?: string;
  fonte: "ia_conhecimento";
}

async function getWatchlist(userId: string): Promise<string[]> {
  const { data } = await db
    .from("Note")
    .select("content")
    .eq("userId", userId)
    .eq("subjectId", NOTE_PREFIX)
    .single();
  if (!data?.content) return [];
  try { return JSON.parse(data.content) as string[]; }
  catch { return []; }
}

async function saveWatchlist(userId: string, list: string[]) {
  const content = JSON.stringify(list);
  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("userId", userId)
    .eq("subjectId", NOTE_PREFIX)
    .single();

  if (existing?.id) {
    await db.from("Note").update({ content }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({ userId, subjectId: NOTE_PREFIX, content });
  }
}

// GET: retorna watchlist
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const list = await getWatchlist(dbUser.id);
    return NextResponse.json({ orgaos: list });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: adicionar órgão ou verificar alertas
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const dbUser = await getUserWithPlan(user.id);
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as { action: "add" | "remove" | "verificar"; orgao?: string };

    if (body.action === "add" && body.orgao) {
      const list = await getWatchlist(dbUser.id);
      const nome = body.orgao.trim().slice(0, 60);
      if (!list.includes(nome)) {
        list.push(nome);
        await saveWatchlist(dbUser.id, list);
      }
      return NextResponse.json({ orgaos: list });
    }

    if (body.action === "remove" && body.orgao) {
      const list = await getWatchlist(dbUser.id);
      const updated = list.filter(o => o !== body.orgao);
      await saveWatchlist(dbUser.id, updated);
      return NextResponse.json({ orgaos: updated });
    }

        if (body.action === "verificar") {
      const rl = await editalLimiter.check(dbUser.id);
      if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });
      const list = await getWatchlist(dbUser.id);
      if (list.length === 0) {
        return NextResponse.json({ alertas: [] });
      }

      const EDITAL_SYSTEM = "Você é um especialista em concursos públicos brasileiros com amplo conhecimento dos principais órgãos, bancas e histórico de editais no Brasil.";
      const prompt = `Analise os seguintes órgãos e forneça informações sobre concursos públicos recentes ou previstos. Analise os seguintes órgãos/entidades e forneça informações sobre concursos públicos recentes ou previstos para cada um, com base no seu conhecimento até a data de corte.

Órgãos monitorados: ${list.join(", ")}

Para cada órgão, retorne um JSON com as informações mais atualizadas que você tem. Use o status:
- "em_andamento": concurso com inscrições abertas ou provas já agendadas (que você tem conhecimento)
- "provavelmente_aberto": edital lançado recentemente, provável que esteja vigente
- "previsto": concurso previsto mas não confirmado, baseado em histórico/demanda
- "sem_info": sem informações relevantes sobre concurso recente

FORMATO JSON (array):
[
  {
    "orgao": "Nome do órgão",
    "status": "em_andamento|provavelmente_aberto|previsto|sem_info",
    "titulo": "Nome do concurso ou 'Sem informação recente'",
    "descricao": "Breve descrição do que você sabe (1-2 frases)",
    "banca": "Banca se souber, ou null",
    "vagas": "Número aproximado de vagas se souber, ou null",
    "prazo": "Período aproximado se souber, ou null",
    "salario": "Faixa salarial se souber, ou null",
    "fonte": "ia_conhecimento"
  }
]

IMPORTANTE: Seja honesto sobre o que sabe. Use 'sem_info' quando não tiver dados confiáveis. Não invente informações específicas (números de vagas, datas exatas) a não ser que tenha alta confiança.

Retorne APENAS o array JSON, sem texto adicional.`;

      const response = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 2000,
        systemPrompt: EDITAL_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        cacheSystem: true,
      });

      const raw = response.content[0]?.type === "text" ? response.content[0].text : "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return NextResponse.json({ alertas: [] });

      const alertas = JSON.parse(jsonMatch[0]) as EditalAlerta[];
      return NextResponse.json({ alertas, verificadoEm: new Date().toISOString() });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
