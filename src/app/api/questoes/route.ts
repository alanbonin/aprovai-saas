import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { questoesLimiter } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const rl = await questoesLimiter.check(user.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  // ── Verificação de acesso (assinatura ativa) ──────────────────────────────
  const { getAccessLevel } = await import("@/lib/access");
  const access = await getAccessLevel();
  if (access.maxQuestionsPerWeek === 0) {
    return NextResponse.json({ error: "Acesso expirado. Assine um plano para continuar." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const banca      = searchParams.get("banca");
  const level      = searchParams.get("level");
  const subjectId  = searchParams.get("subjectId");
  // subjectIds aceita múltiplos IDs separados por vírgula (unificação cross-categoria)
  const subjectIdsParam = searchParams.get("subjectIds");
  const subjectIds = subjectIdsParam ? subjectIdsParam.split(",").filter(Boolean) : null;
  const yearRaw    = searchParams.get("year");
  const year       = yearRaw ? (parseInt(yearRaw, 10) || null) : null;
  const onlyFavs   = searchParams.get("favoritos") === "1";
  const onlyErros  = searchParams.get("erros") === "1";
  const limit      = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10) || 20);

  // IDs já respondidos (evita repetição)
  const seenParam = searchParams.get("seen"); // CSV de IDs já vistos
  const seenIds   = seenParam ? seenParam.split(",").map(Number).filter(Boolean) : [];

  const dbUser = await getUserWithPlan(user.id);

  // ── Filtro por Favoritos ────────────────────────────────────────────────────
  let favIds: number[] | null = null;
  if (onlyFavs) {
    if (dbUser) {
      const { data: note } = await db.from("Note").select("content")
        .eq("userId", dbUser.id).eq("subjectId", "__FAV_Q__").maybeSingle();
      favIds = note?.content ? (JSON.parse(note.content) as number[]) : [];
    }
    if (!favIds?.length) return NextResponse.json({ questions: [] });
  }

  // ── Filtro por Erros ────────────────────────────────────────────────────────
  let erroIds: number[] | null = null;
  if (onlyErros && dbUser) {
    const { data: wrongProgress } = await db
      .from("Progress").select("questionId")
      .eq("userId", dbUser.id).eq("correct", false).limit(5000);
    const { data: rightProgress } = await db
      .from("Progress").select("questionId")
      .eq("userId", dbUser.id).eq("correct", true).limit(5000);

    const rightIds = new Set((rightProgress ?? []).map(p => p.questionId as number));
    erroIds = (wrongProgress ?? [])
      .map(p => p.questionId as number)
      .filter(id => !rightIds.has(id));
    if (!erroIds.length) return NextResponse.json({ questions: [] });
  }

  // ── Query principal — sempre do banco, NUNCA gera na hora ──────────────────
  // Busca um pool maior e randomiza no servidor para variedade
  const poolSize = Math.min(2000, limit * 50);

  // Gabarito (answer/explanation) removido — enviado apenas pela rota /verificar após resposta
  let query = db.from("Question")
    .select("id,subjectId,banca,year,level,statement,optionA,optionB,optionC,optionD,optionE,answer,explanation,artigo,dicaBanca,source")
    .limit(poolSize);

  // Apenas questões aprovadas (favoritos ignoram esse filtro)
  if (!onlyFavs) query = query.eq("aprovado", true);

  if (banca)          query = query.ilike("banca", `%${banca.replace(/[%_\\]/g, "\\$&").slice(0, 100)}%`);
  if (level)          query = query.eq("level", level);
  if (subjectIds?.length) query = query.in("subjectId", subjectIds);   // múltiplos (cross-categoria)
  else if (subjectId) query = query.eq("subjectId", subjectId);        // legado: ID único
  if (year)           query = query.eq("year", year);
  if (favIds?.length)  query = query.in("id", favIds);
  if (erroIds?.length) query = query.in("id", erroIds);

  // Exclui questões já vistas nesta sessão
  if (seenIds.length > 0 && !onlyFavs && !onlyErros) {
    query = query.not("id", "in", `(${seenIds.slice(-100).join(",")})`);
  }

  const result = await query;
  let questions = result.data;
  let queryError = result.error;
  // Fallback sem filtro de aprovado se coluna não existe ainda (código PostgREST: 42703)
  if (queryError && (queryError as { code?: string }).code === "42703") {
    const fallbackResult = await db.from("Question")
      .select("id,subjectId,banca,year,level,statement,optionA,optionB,optionC,optionD,optionE,answer,explanation,artigo,dicaBanca,source")
      .limit(poolSize);
    questions = fallbackResult.data;
    queryError = fallbackResult.error;
  }
  if (queryError) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  if (!questions?.length) {
    // Se esgotou questões não-vistas, retorna sem filtro de seen
    const { data: fallback } = await db
      .from("Question")
      .select("id,subjectId,banca,year,level,statement,optionA,optionB,optionC,optionD,optionE,answer,explanation,artigo,dicaBanca,source")
      .eq("aprovado", true)
      .limit(limit);
    const shuffled = (fallback ?? []).sort(() => Math.random() - 0.5).slice(0, limit);
    return NextResponse.json({ questions: shuffled, exhausted: true });
  }

  // Randomiza e retorna o limite solicitado
  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, limit);
  return NextResponse.json({ questions: shuffled });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const ALLOWED = ["statement", "optionA", "optionB", "optionC", "optionD", "optionE", "answer", "explanation", "level", "year", "banca", "subjectId", "artigo", "dicaBanca", "tipo", "source"];
  const insert: Record<string, unknown> = { aprovado: false };
  for (const key of ALLOWED) {
    if (key in body) insert[key] = body[key];
  }
  const { data, error } = await db.from("Question").insert(insert).select().single();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
