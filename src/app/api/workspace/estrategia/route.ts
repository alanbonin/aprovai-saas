import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { getActiveProfile } from "@/lib/get-active-profile";
import { log } from "@/lib/logger";
import { resolveCargoId } from "@/lib/cargos";
import { getMateriasParaCargo } from "@/lib/materias-por-cargo";
import { defaultAiLimiter } from "@/lib/rate-limit";

// ── Tipos públicos ─────────────────────────────────────────────────────────────
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

export interface AjusteRecord {
  data: string;
  motivo: string;
  resumoMudancas: string;
}

interface PlanNoteData {
  __key: "plano_semanal";
  weekStart: string;
  cronograma: Cronograma;
  ajustes: AjusteRecord[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Seg...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

const PLANO_SUBJECT_KEY = "__PLANO_SEMANAL__";

async function getPlanNote(userId: string, profileId: string | null): Promise<{ id: string; data: PlanNoteData } | null> {
  // Plano ESTRITAMENTE do perfil ativo — sem fallback cross-perfil
  let query = db
    .from("Note")
    .select("id, content")
    .eq("userId", userId)
    .eq("subjectId", PLANO_SUBJECT_KEY)
    .order("updatedAt", { ascending: false })
    .limit(5);

  if (profileId) {
    query = query.eq("profileId", profileId);
  } else {
    query = query.is("profileId", null);
  }

  const { data: notes } = await query;

  for (const note of notes ?? []) {
    try {
      const parsed = JSON.parse(note.content as string) as PlanNoteData;
      if (parsed.__key === "plano_semanal") return { id: note.id as string, data: parsed };
    } catch { /* skip */ }
  }

  return null;
}

async function savePlanNote(userId: string, profileId: string | null, data: PlanNoteData, existingId?: string) {
  const now = new Date().toISOString();
  if (existingId) {
    await db.from("Note").update({ content: JSON.stringify(data), updatedAt: now }).eq("id", existingId);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId,
      profileId: profileId ?? undefined,
      subjectId: PLANO_SUBJECT_KEY,
      content: JSON.stringify(data),
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function getProfileAndSubjects(userId: string) {
  const [profileRow, subjectsRes] = await Promise.all([
    getActiveProfile(userId),
    db.from("StudentSubject").select("Subject(id, name)").eq("userId", userId),
  ]);
  const profileRes = { data: profileRow };

  const profile = profileRes.data;
  const materiasMatriculadas = ((subjectsRes.data ?? []) as { Subject: { name: string }[] | { name: string } | null }[])
    .map(ss => {
      const s = ss.Subject;
      return Array.isArray(s) ? s[0]?.name : (s as { name: string } | null)?.name;
    })
    .filter(Boolean) as string[];

  // Enriquece com matérias do mapeamento de cargos (edital real)
  let materiasEdital: string[] = [];
  let cargoResolvidoId: string | undefined;
  let estadoResolvido: string | undefined;

  if (profile?.cargo || profile?.orgao) {
    const resolved = resolveCargoId(profile.cargo ?? "", profile.orgao ?? "");
    if (resolved) {
      cargoResolvidoId = resolved.cargoId;
      estadoResolvido = resolved.estado;
      materiasEdital = getMateriasParaCargo(resolved.cargoId, resolved.estado);
    }
  }

  // Une matérias matriculadas + edital, sem duplicatas
  const todasMaterias = [...new Set([...materiasMatriculadas, ...materiasEdital])];
  const materias = todasMaterias.length > 0 ? todasMaterias : materiasMatriculadas;

  let diasProva: number | null = null;
  if (profile?.dataProva) {
    diasProva = Math.max(0, Math.ceil(
      (new Date(profile.dataProva).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ));
  }

  return { profile, materias, materiasEdital, cargoResolvidoId, estadoResolvido, diasProva };
}

// ── GET — busca plano salvo ────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ cronograma: null, ajustes: [] });

    const activeProfile = await getActiveProfile(dbUser.id);
    const profileId = activeProfile?.id ?? null;

    const note = await getPlanNote(dbUser.id, profileId);
    if (!note) return NextResponse.json({ cronograma: null, ajustes: [] });

    return NextResponse.json({
      cronograma: note.data.cronograma,
      ajustes: note.data.ajustes ?? [],
      weekStart: note.data.weekStart,
      isCurrentWeek: note.data.weekStart === getWeekStart(),
    });
  } catch (err) {
    log.error("workspace.estrategia_get_error", {}, err);
    return NextResponse.json({ cronograma: null, ajustes: [] });
  }
}

// ── POST — gerar ou ajustar ────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Rate limit de burst — 10 req/min por usuário
    const rl = await defaultAiLimiter.check(user.id);
    if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json() as {
      action?: "gerar" | "ajustar";
      horasPorDia?: number;
      diasDisp?: string[];
      motivo?: string;
    };

    const activeProfile = await getActiveProfile(dbUser.id);
    const profileId = activeProfile?.id ?? null;

    const { profile, materias, materiasEdital, cargoResolvidoId, estadoResolvido, diasProva } = await getProfileAndSubjects(dbUser.id);

    // ── AJUSTAR ───────────────────────────────────────────────────────────────
    if (body.action === "ajustar") {
      if (!body.motivo?.trim()) {
        return NextResponse.json({ error: "Motivo do ajuste é obrigatório" }, { status: 400 });
      }

      const note = await getPlanNote(dbUser.id, profileId);
      if (!note?.data.cronograma) {
        return NextResponse.json({ error: "Nenhum plano encontrado para ajustar. Gere um plano primeiro." }, { status: 400 });
      }

      const historicoAjustes = note.data.ajustes ?? [];

      const prompt = `PERFIL DO ALUNO:
- Cargo: ${profile?.cargo ?? "não informado"} / ${profile?.orgao ?? "não informado"}
- Dias para prova: ${diasProva !== null ? diasProva + " dias" : "não informado"}
- Matérias: ${materias.join(", ") || "não informado"}
- Dificuldades: ${profile?.dificuldades ?? "não informado"}
- Banca: ${profile?.banca ?? "não informada"}

PLANO ATUAL:
${JSON.stringify(note.data.cronograma, null, 2)}

HISTÓRICO DE AJUSTES (últimos 3):
${historicoAjustes.slice(-3).map(a => `• ${a.data}: "${a.motivo}" → ${a.resumoMudancas}`).join("\n") || "Nenhum ajuste anterior."}

PEDIDO DE AJUSTE DO ALUNO:
"${body.motivo}"

Analise o pedido com inteligência e ajuste o plano:
- Imprevistos/trabalho → redistribua horas dos dias afetados para outros dias
- Foco em matéria específica → aumente carga nela, reduza proporcionalmente em outras
- Mais descanso → marque dias como folga e redistribua o conteúdo
- Dificuldade em tema → aumente tempo e melhore as dicas práticas desse tema
- Mantenha total de horas próximo ao original, salvo pedido contrário

ATIVIDADES PERMITIDAS NAS DICAS (use SOMENTE estas):
Questões, Desafio Diário, Quiz Rápido, Simulado, Flashcards, Biblioteca PDF, Estudar com Mentor IA, Caderno de Erros, Desafio Semanal, Adaptativo.
NUNCA mencione: questões comentadas, editar/criar flashcards, mapas mentais, resumos, ferramentas externas.

Retorne APENAS JSON válido:
{"cronograma":{"semana":[{"dia":"Segunda","materias":[{"nome":"...","horas":1.5,"prioridade":"alta","dica":"..."}],"totalHoras":3,"folga":false}],"resumo":"...","metaSemanal":"...","horasTotais":18,"geradoEm":""},"resumoMudancas":"Explicação em 2-3 frases do que foi ajustado e por quê"}`;

      const response = await createWithCache({
        model: MODELS.sonnet, maxTokens: 3000, cacheSystem: false,
        systemPrompt: "Você é um estrategista especializado em concursos públicos brasileiros. Responda apenas com JSON válido.",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (response.content[0] as { type: string; text: string }).text;
      const result = extractJSON<{ cronograma: Cronograma; resumoMudancas: string }>(raw);
      result.cronograma.geradoEm = new Date().toISOString();

      const novoAjuste: AjusteRecord = {
        data: new Date().toLocaleDateString("pt-BR"),
        motivo: body.motivo,
        resumoMudancas: result.resumoMudancas ?? "",
      };

      const planData: PlanNoteData = {
        __key: "plano_semanal",
        weekStart: note.data.weekStart,
        cronograma: result.cronograma,
        ajustes: [...historicoAjustes, novoAjuste].slice(-10),
      };

      await savePlanNote(dbUser.id, profileId, planData, note.id);

      return NextResponse.json({
        cronograma: result.cronograma,
        ajustes: planData.ajustes,
        resumoMudancas: result.resumoMudancas,
      });
    }

    // ── GERAR ─────────────────────────────────────────────────────────────────
    const horasPorDia = body.horasPorDia ?? (profile?.horasEstudo as number | null) ?? 3;
    const diasDisp = body.diasDisp ?? ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

    const systemPrompt = `Você é um estrategista especializado em concursos públicos brasileiros.
Gere um cronograma semanal de estudos PERSONALIZADO e DETALHADO no formato JSON.

PERFIL DO ALUNO:
- Cargo/Órgão: ${profile?.cargo ?? "não informado"} / ${profile?.orgao ?? "não informado"}
- Dias para prova: ${diasProva !== null ? diasProva + " dias" : "não informado"}
- Dificuldades: ${profile?.dificuldades ?? "não informado"}
- Banca: ${profile?.banca ?? "não informada"}
- Matérias exigidas pelo edital (${cargoResolvidoId ?? "base geral"}${estadoResolvido ? ` / ${estadoResolvido}` : ""}): ${materiasEdital.length > 0 ? materiasEdital.join(", ") : "não mapeado"}
- Matérias do aluno: ${materias.length > 0 ? materias.join(", ") : "gerais (Direito Constitucional, Administrativo, Português, Raciocínio Lógico)"}
- Horas por dia: ${horasPorDia}h
- Dias disponíveis: ${diasDisp.join(", ")}

ATIVIDADES DISPONÍVEIS NO SISTEMA (use SOMENTE estas nas dicas — nunca invente outras):
- "Responda questões de [matéria] no menu Questões"
- "Faça o Desafio Diário"
- "Faça um Quiz Rápido de [matéria]"
- "Faça um Simulado"
- "Revise seus Flashcards de [matéria]"
- "Leia a apostila de [matéria] na Biblioteca PDF"
- "Estude [tópico] no menu Estudar com o Mentor IA"
- "Revise os erros no Caderno de Erros"
- "Faça o Desafio Semanal"
- "Pratique no modo Adaptativo de [matéria]"

PROIBIDO mencionar nas dicas:
- "questões comentadas" (não existe)
- "atualizar/editar flashcards" (flashcards são gerados automaticamente, não editáveis)
- "criar flashcards" (não é função do aluno)
- "mapas mentais" (não existe)
- "resumos próprios" (não existe editor de texto)
- qualquer ferramenta externa ao sistema

REGRAS PEDAGÓGICAS:
1. Distribua estrategicamente — não repita a mesma matéria no mesmo dia
2. Matérias mais cobradas (Direito Administrativo, Constitucional, Português) têm maior carga
3. Intercale matérias difíceis com mais fáceis no mesmo dia
4. Reserve pelo menos 1 dia focado em questões e revisão
5. Se diasProva < 30: foco em revisão rápida + simulados
6. Se diasProva < 7: apenas pontos críticos
7. Dica PRÁTICA e específica usando APENAS as atividades do sistema acima

Retorne APENAS JSON (sem texto antes ou depois), incluindo TODOS os 7 dias (Segunda a Domingo — sem pular nenhum, inclusive Sábado e Domingo que também são dias de estudo):
{"semana":[{"dia":"Segunda","materias":[{"nome":"Direito Administrativo","horas":1.5,"prioridade":"alta","dica":"Foque nos princípios LIMPE — 10 questões do Art. 37 CF/88"}],"totalHoras":3.0,"folga":false}],"resumo":"Frase motivadora personalizada","metaSemanal":"Objetivo específico e mensurável","horasTotais":21}`;

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 3000,
      systemPrompt,
      messages: [{ role: "user", content: "Gere meu cronograma semanal personalizado." }],
      cacheSystem: true,
    });

    const raw = (response.content[0] as { type: string; text: string }).text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Falha ao gerar cronograma" }, { status: 500 });

    const cronograma = JSON.parse(jsonMatch[0]) as Cronograma;
    cronograma.geradoEm = new Date().toISOString();

    const currentWeek = getWeekStart();
    const existingNote = await getPlanNote(dbUser.id, profileId);
    const planData: PlanNoteData = {
      __key: "plano_semanal",
      weekStart: currentWeek,
      cronograma,
      ajustes: existingNote?.data.weekStart === currentWeek
        ? (existingNote.data.ajustes ?? [])
        : [],
    };
    await savePlanNote(dbUser.id, profileId, planData, existingNote?.id);

    return NextResponse.json({ cronograma, ajustes: planData.ajustes });
  } catch (err) {
    log.error("workspace.estrategia_post_error", {}, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
