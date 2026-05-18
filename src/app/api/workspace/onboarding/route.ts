import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";

// ── Keyword matching para detectar área do cargo ─────────────────────
const AREA_KEYWORDS: Record<string, string[]> = {
  policial:     ["polici", "delegad", "agente de", "investigad", "depen", "pcdf", "pcsp"],
  tributario:   ["tribut", "auditor", "fiscal", "receita", "financ", "sefaz"],
  judiciario:   ["judici", "analista judici", "tecnico judici", "trf", "tre", "tse", "tj"],
  legislativo:  ["camara", "senado", "legislat", "assembleia", "vereador"],
  mp:           ["ministerio publico", "promotor", "mpf", "mpsp"],
  procuradoria: ["procuradoria", "procurador", "agu", "pge", "pgm"],
  militar:      ["militar", "exerc", "marinha", "aeronaut", "bombeiro"],
  saude:        ["saude", "enfermeiro", "medico", "sus", "anvisa"],
  bancario:     ["banco", "caixa economica", "banco central", "bacen"],
  gestao:       ["gestao", "administrat", "assistente administrat"],
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function detectArea(cargo: string, orgao: string): string {
  const text = normalize(`${cargo} ${orgao}`);
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return area;
  }
  return "geral";
}

interface AgentRow { id: string; name: string; categoria: string | null; banca: string | null }

function selectAgents(allAgents: AgentRow[], cargo: string, orgao: string, banca: string): string[] {
  const area    = detectArea(cargo, orgao);
  const bancaN  = normalize(banca).split(/[\s/]/)[0];

  const areaAgent = allAgents.find(a =>
    (a.categoria && normalize(a.categoria).includes(area)) ||
    (a.name && normalize(a.name).includes(area))
  );
  const bancaAgent = bancaN ? allAgents.find(a =>
    (a.banca && normalize(a.banca).includes(bancaN)) ||
    (a.name && normalize(a.name).includes(bancaN))
  ) : undefined;

  const ids = [...new Set([areaAgent?.id, bancaAgent?.id].filter(Boolean))] as string[];
  if (ids.length === 0 && allAgents.length > 0) ids.push(allAgents[0].id);
  return ids.slice(0, 3);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const body = await req.json();
    const { message, history = [] } = body as {
      message: string;
      history: { role: string; content: string }[];
    };

    const systemPrompt = `Você é a Estrategista Aprovai, uma assistente especializada em planejamento de estudos para concursos públicos.

Seu papel é coletar as informações essenciais do aluno de forma NATURAL e CONVERSACIONAL — uma pergunta por vez.

SEQUÊNCIA (siga esta ordem, uma por mensagem):
1. Qual cargo e órgão você quer prestar? (e em qual estado, se aplicável)
2. Qual é a banca organizadora do concurso? (ex: CESPE/CEBRASPE, FCC, AOCP, VUNESP, FGV, FUNCAB, IBFC, Quadrix...)
3. Você tem data prevista para a prova? (se sim, qual?)
4. Quais são suas maiores dificuldades de estudo hoje?

REGRAS:
- APENAS UMA pergunta por mensagem
- Se o aluno responder várias coisas de uma vez, agradeça e avance para a próxima pendente
- Seja motivador, use emojis com moderação
- Se não souber a banca, anote como "Não informada"
- Não peça mais de 4 informações no total
- NÃO mencione "mentores", "agentes" ou "equipe" — você é a única IA neste momento

QUANDO TIVER cargo + órgão + banca (mínimo 3 infos coletadas):
Envie uma mensagem de encerramento animada dizendo que vai montar o plano agora. Depois adicione na MESMA linha (sem quebra):
__DONE__{"cargo":"...","orgao":"...","banca":"...","dataProva":null,"dificuldades":"..."}

Exemplos de banca: "CESPE", "FCC", "AOCP", "VUNESP", "FGV", "IBFC", "Quadrix", "FUNCAB", "Não informada"

Responda SEMPRE em português brasileiro.`;

    // Filtra histórico — Anthropic exige que 1ª msg seja "user"
    const rawHistory = history.slice(-10).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const firstUserIdx = rawHistory.findIndex(m => m.role === "user");
    const filteredHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 1024,
      systemPrompt,
      cacheSystem: true,
      messages: [
        ...filteredHistory,
        { role: "user", content: message },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";

    if (!rawText.includes("__DONE__")) {
      // Resposta normal da conversa
      return NextResponse.json({ text: rawText, done: false });
    }

    // ── Onboarding concluído ───────────────────────────────────────────
    const [textPart, jsonPart] = rawText.split("__DONE__");

    let profile: { cargo: string; orgao: string; banca: string; dataProva: string | null; dificuldades: string } | null = null;
    try { profile = JSON.parse((jsonPart ?? "").trim()); } catch { /* continua sem perfil */ }

    if (!profile) {
      return NextResponse.json({ text: textPart, done: false });
    }

    // Sanitiza dataProva — aceita só formato YYYY-MM-DD; qualquer outra coisa vira null
    function sanitizeDate(val: unknown): string | null {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      // Aceita YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : trimmed;
      }
      // Tenta converter dd/mm/yyyy
      const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2,"0")}-${brMatch[1].padStart(2,"0")}`;
      // Tenta Date.parse como último recurso
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return null; // texto livre como "setembro" vira null
    }

    // 1. Salvar StudentProfile — busca existente, atualiza ou cria
    const profileFields = {
      cargo: profile.cargo,
      orgao: profile.orgao,
      dataProva: sanitizeDate(profile.dataProva),
      dificuldades: profile.dificuldades ?? null,
      onboardingDone: true,
      updatedAt: new Date().toISOString(),
    };

    // Busca perfil existente (sem .single() para não lançar erro se não existir)
    const { data: existingRows } = await db
      .from("StudentProfile")
      .select("id")
      .eq("userId", dbUser.id)
      .limit(1);

    const existingProfile = existingRows?.[0] ?? null;
    let savedProfile: Record<string, unknown> | null = null;

    if (existingProfile) {
      // Atualiza o registro existente
      const { data, error: updErr } = await db
        .from("StudentProfile")
        .update(profileFields)
        .eq("id", existingProfile.id)
        .select();

      if (updErr) {
        console.error("[onboarding] update error:", updErr.message);
        return NextResponse.json({ error: `Erro ao atualizar perfil: ${updErr.message}` }, { status: 500 });
      }
      savedProfile = (data ?? [])[0] ?? null;
    } else {
      // Cria novo registro
      const { data, error: insErr } = await db
        .from("StudentProfile")
        .insert({
          id: crypto.randomUUID(),
          userId: dbUser.id,
          ...profileFields,
          createdAt: new Date().toISOString(),
        })
        .select();

      if (insErr) {
        console.error("[onboarding] insert error:", insErr.message);
        return NextResponse.json({ error: `Erro ao criar perfil: ${insErr.message}` }, { status: 500 });
      }
      savedProfile = (data ?? [])[0] ?? null;
    }

    // [onboarding] profile saved

    // 2. Buscar agentes disponíveis e selecionar os ideais
    const { data: allAgents } = await db
      .from("Agent")
      .select("id, name, categoria, banca, color, description, systemPrompt")
      .eq("active", true);

    const selectedIds = selectAgents(
      (allAgents ?? []) as AgentRow[],
      profile.cargo, profile.orgao, profile.banca,
    );

    // 3. Limpar UserAgent anteriores e inserir novos
    await db.from("UserAgent").delete().eq("userId", dbUser.id);

    for (const agentId of selectedIds) {
      const { error: uaErr } = await db.from("UserAgent").insert(
        { id: crypto.randomUUID(), userId: dbUser.id, agentId, createdAt: new Date().toISOString() }
      );
      if (uaErr) console.error("[onboarding] UserAgent insert error:", uaErr);
    }

    // 4. Buscar dados dos agentes selecionados para retornar ao cliente
    const { data: selectedAgents } = selectedIds.length > 0
      ? await db.from("Agent").select("id, name, description, categoria, banca, color, systemPrompt").in("id", selectedIds)
      : { data: [] };

    // [onboarding] done

    return NextResponse.json({
      text: textPart,
      done: true,
      profile: savedProfile,
      subjects: [],
      agents: selectedAgents ?? [],
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
