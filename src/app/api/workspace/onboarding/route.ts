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

function selectAgents(allAgents: AgentRow[], cargo: string, orgao: string, banca: string, maxAgents: number): string[] {
  const area   = detectArea(cargo, orgao);
  const bancaN = normalize(banca).split(/[\s/]/)[0];

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
  return ids.slice(0, Math.max(1, maxAgents));
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const body = await req.json();
    const { message, history = [], maxConcursos = 1, userName = "" } = body as {
      message: string;
      history: { role: string; content: string }[];
      maxConcursos: number;
      userName: string;
    };

    // ── System prompt dinâmico conforme o plano ──────────────────────
    const multiConcurso = maxConcursos > 1;
    const concursoBloco = multiConcurso
      ? `2. Qual(is) cargo(s) e órgão(s) você quer prestar? (Seu plano permite até ${maxConcursos} concursos simultâneos — liste todos se quiser)
   *(Ex: "1) Delegado PCSP / 2) Auditor Receita Federal")*`
      : `2. Qual cargo e órgão você quer prestar? (e em qual estado, se aplicável)
   *(Ex: Delegado da Polícia Civil de SP, Auditor da Receita Federal, Analista do TRF…)*`;

    // ── Mensagem de init: gera apenas o primeiro greeting ───────────────
    if (message === "__INIT__") {
      const greeting = userName
        ? `Olá, **${userName.split(" ")[0]}**! 😊 Fico feliz em te ajudar a conquistar sua aprovação!\n\nAntes de tudo: como você prefere ser chamado(a)? Pode ser seu nome, apelido — o que preferir!`
        : `Olá! 😊 Fico feliz em te ajudar a conquistar sua aprovação!\n\nAntes de tudo: como você prefere ser chamado(a)? Pode ser seu nome ou apelido favorito!`;
      return NextResponse.json({ text: greeting, done: false });
    }

    const sistemPrompt = `Você é a Estrategista Aprovai, assistente especializada em planejamento para concursos públicos.

Seu papel é coletar as informações essenciais do aluno de forma NATURAL e CONVERSACIONAL — UMA pergunta por mensagem.

CONTEXTO: A conversa já foi iniciada e o aluno já foi saudado. A primeira mensagem do histórico é sua saudação pedindo o nome preferido. A partir da RESPOSTA DO NOME do aluno, use esse nome em TODAS as mensagens seguintes.

SEQUÊNCIA OBRIGATÓRIA (siga esta ordem, uma por mensagem — a saudação já foi feita):
1. [JÁ FEITO] Perguntou como o aluno prefere ser chamado
${concursoBloco}
3. Qual é a banca organizadora? (ex: CESPE/CEBRASPE, FCC, AOCP, VUNESP, FGV, FUNCAB, IBFC, Quadrix…)
4. Você tem data prevista para a prova? (se sim, qual?)
5. Quantas horas por dia você consegue dedicar aos estudos? (ex: 1h, 2h, 4h…)
6. Como você se avalia hoje? Iniciante (nunca estudou para concurso), Intermediário (já estudou um pouco) ou Avançado (estuda há mais de 6 meses)?
7. Qual é seu melhor horário para estudar? Manhã, Tarde, Noite ou Varia?
8. Quais são suas maiores dificuldades ou matérias que mais teme?

REGRAS:
- EXATAMENTE UMA pergunta por mensagem
- Use SEMPRE o nome que o aluno informou ao responder a pergunta 1 — nunca use o nome cadastrado como substituto
- Se o aluno responder várias coisas de uma vez, agradeça e avance pelas próximas pendentes (uma por uma)
- Seja motivador, use emojis com moderação
- Se não souber a banca, anote como "Não informada"
- NÃO mencione "mentores", "agentes" ou "equipe" — você é a única IA neste momento
- Ao fazer a pergunta 5 (horas), forneça exemplos: "1h", "2h", "3h ou mais"
- Ao fazer a pergunta 6 (nível), apresente as 3 opções claramente
- Ao fazer a pergunta 7 (horário), apresente as 4 opções

QUANDO TIVER nome + cargo + banca + pelo menos 3 outras respostas (mínimo 6 infos coletadas):
Envie uma mensagem de encerramento animada chamando o aluno pelo nome preferido. Depois adicione na MESMA linha (sem quebra):
__DONE__{"nomePreferido":"...","cargo":"...","orgao":"...","banca":"...","dataProva":null,"horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"..."}

Valores válidos:
- nomePreferido: exatamente o nome/apelido que o aluno disse querer ser chamado
- horasEstudo: número inteiro (1, 2, 3, 4, 5, 6)
- nivelAtual: "iniciante" | "intermediario" | "avancado"
- disponibilidade: "manha" | "tarde" | "noite" | "variado"
- dataProva: "YYYY-MM-DD" ou null

Responda SEMPRE em português brasileiro.`;

    // Filtra histórico — Anthropic exige que 1ª msg seja "user"
    const rawHistory = history.slice(-14).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const firstUserIdx = rawHistory.findIndex(m => m.role === "user");
    const filteredHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 1024,
      systemPrompt: sistemPrompt,
      cacheSystem: true,
      messages: [
        ...filteredHistory,
        { role: "user", content: message },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";

    if (!rawText.includes("__DONE__")) {
      return NextResponse.json({ text: rawText, done: false });
    }

    // ── Onboarding concluído ───────────────────────────────────────────
    const [textPart, jsonPart] = rawText.split("__DONE__");

    interface ProfileData {
      nomePreferido: string | null;
      cargo: string;
      orgao: string;
      banca: string;
      dataProva: string | null;
      horasEstudo: number | null;
      nivelAtual: string | null;
      disponibilidade: string | null;
      dificuldades: string | null;
    }

    let profile: ProfileData | null = null;
    try { profile = JSON.parse((jsonPart ?? "").trim()); } catch { /* continua */ }

    if (!profile) {
      return NextResponse.json({ text: textPart, done: false });
    }

    // Sanitiza dataProva — aceita só formato YYYY-MM-DD
    function sanitizeDate(val: unknown): string | null {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : trimmed;
      }
      const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2,"0")}-${brMatch[1].padStart(2,"0")}`;
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return null;
    }

    // Sanitiza horasEstudo — garante inteiro entre 1 e 12
    function sanitizeHoras(val: unknown): number | null {
      const n = typeof val === "number" ? val : parseInt(String(val), 10);
      if (isNaN(n) || n < 1 || n > 12) return null;
      return Math.round(n);
    }

    // Sanitiza nível
    function sanitizeNivel(val: unknown): string | null {
      const valid = ["iniciante", "intermediario", "avancado"];
      if (typeof val !== "string") return null;
      const v = val.toLowerCase().trim();
      return valid.includes(v) ? v : null;
    }

    // Sanitiza disponibilidade
    function sanitizeDisp(val: unknown): string | null {
      const valid = ["manha", "tarde", "noite", "variado"];
      if (typeof val !== "string") return null;
      const v = val.toLowerCase().trim();
      return valid.includes(v) ? v : null;
    }

    // 1. Salvar StudentProfile em duas etapas:
    //    a) Campos garantidos (colunas existentes desde sempre)
    //    b) Campos novos (horasEstudo, nivelAtual, disponibilidade) — silenciosos se colunas ainda não existirem
    const baseFields = {
      cargo: profile.cargo,
      orgao: profile.orgao,
      dataProva: sanitizeDate(profile.dataProva),
      dificuldades: profile.dificuldades ?? null,
      onboardingDone: true,
      updatedAt: new Date().toISOString(),
    };
    const extendedFields = {
      nomePreferido: profile.nomePreferido?.trim() || userName || null,
      horasEstudo: sanitizeHoras(profile.horasEstudo),
      nivelAtual: sanitizeNivel(profile.nivelAtual),
      disponibilidade: sanitizeDisp(profile.disponibilidade),
    };

    const { data: existingRows } = await db
      .from("StudentProfile")
      .select("id")
      .eq("userId", dbUser.id)
      .limit(1);

    const existingProfile = existingRows?.[0] ?? null;
    let savedProfile: Record<string, unknown> | null = null;

    if (existingProfile) {
      // Tenta com campos novos primeiro; se falhar (coluna inexistente), salva só base
      const { data, error: updErr } = await db
        .from("StudentProfile")
        .update({ ...baseFields, ...extendedFields })
        .eq("id", existingProfile.id)
        .select();
      if (updErr) {
        if (updErr.message?.includes("column") || updErr.code === "PGRST204") {
          // Colunas novas ainda não existem no banco — salva só base
          console.warn("[onboarding] colunas extras não existem, salvando apenas base:", updErr.message);
          const { data: d2, error: e2 } = await db
            .from("StudentProfile")
            .update(baseFields)
            .eq("id", existingProfile.id)
            .select();
          if (e2) return NextResponse.json({ error: `Erro ao atualizar perfil: ${e2.message}` }, { status: 500 });
          savedProfile = (d2 ?? [])[0] ?? null;
        } else {
          console.error("[onboarding] update error:", updErr.message);
          return NextResponse.json({ error: `Erro ao atualizar perfil: ${updErr.message}` }, { status: 500 });
        }
      } else {
        savedProfile = (data ?? [])[0] ?? null;
      }
    } else {
      // Tenta com campos novos; se falhar, cria só com base
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error: insErr } = await db
        .from("StudentProfile")
        .insert({ id: newId, userId: dbUser.id, ...baseFields, ...extendedFields, createdAt: now })
        .select();
      if (insErr) {
        if (insErr.message?.includes("column") || insErr.code === "PGRST204") {
          console.warn("[onboarding] colunas extras não existem, criando apenas base:", insErr.message);
          const { data: d2, error: e2 } = await db
            .from("StudentProfile")
            .insert({ id: newId, userId: dbUser.id, ...baseFields, createdAt: now })
            .select();
          if (e2) return NextResponse.json({ error: `Erro ao criar perfil: ${e2.message}` }, { status: 500 });
          savedProfile = (d2 ?? [])[0] ?? null;
        } else {
          console.error("[onboarding] insert error:", insErr.message);
          return NextResponse.json({ error: `Erro ao criar perfil: ${insErr.message}` }, { status: 500 });
        }
      } else {
        savedProfile = (data ?? [])[0] ?? null;
      }
    }

    // 2. Buscar agentes e selecionar os ideais
    const { data: allAgents } = await db
      .from("Agent")
      .select("id, name, categoria, banca, color, description, systemPrompt")
      .eq("active", true);

    const selectedIds = selectAgents(
      (allAgents ?? []) as AgentRow[],
      profile.cargo, profile.orgao, profile.banca,
      maxConcursos,
    );

    // 3. Limpar UserAgent anteriores e inserir novos
    await db.from("UserAgent").delete().eq("userId", dbUser.id);
    for (const agentId of selectedIds) {
      const { error: uaErr } = await db.from("UserAgent").insert(
        { id: crypto.randomUUID(), userId: dbUser.id, agentId, createdAt: new Date().toISOString() }
      );
      if (uaErr) console.error("[onboarding] UserAgent insert error:", uaErr);
    }

    // 4. Buscar dados dos agentes selecionados
    const { data: selectedAgents } = selectedIds.length > 0
      ? await db.from("Agent").select("id, name, description, categoria, banca, color, systemPrompt").in("id", selectedIds)
      : { data: [] };

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
