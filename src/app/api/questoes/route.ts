import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const banca      = searchParams.get("banca");
  const level      = searchParams.get("level");
  const subjectId  = searchParams.get("subjectId");
  const year       = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const onlyFavs   = searchParams.get("favoritos") === "1";
  const onlyErros  = searchParams.get("erros") === "1";
  const limit      = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  // IDs já respondidos (evita repetição)
  const seenParam = searchParams.get("seen"); // CSV de IDs já vistos
  const seenIds   = seenParam ? seenParam.split(",").map(Number).filter(Boolean) : [];

  const dbUser = await getUserWithPlan(user.id);

  // ── Filtro por Favoritos ────────────────────────────────────────────────────
  let favIds: number[] | null = null;
  if (onlyFavs) {
    if (dbUser) {
      const { data: note } = await db.from("Note").select("content")
        .eq("userId", dbUser.id).eq("subjectId", "__FAV_Q__").single();
      favIds = note?.content ? (JSON.parse(note.content) as number[]) : [];
    }
    if (!favIds?.length) return NextResponse.json({ questions: [] });
  }

  // ── Filtro por Erros ────────────────────────────────────────────────────────
  let erroIds: number[] | null = null;
  if (onlyErros && dbUser) {
    const { data: wrongProgress } = await db
      .from("Progress").select("questionId")
      .eq("userId", dbUser.id).eq("correct", false);
    const { data: rightProgress } = await db
      .from("Progress").select("questionId")
      .eq("userId", dbUser.id).eq("correct", true);

    const rightIds = new Set((rightProgress ?? []).map(p => p.questionId as number));
    erroIds = (wrongProgress ?? [])
      .map(p => p.questionId as number)
      .filter(id => !rightIds.has(id));
    if (!erroIds.length) return NextResponse.json({ questions: [] });
  }

  // ── Query principal — sempre do banco, NUNCA gera na hora ──────────────────
  // Busca um pool maior e randomiza no servidor para variedade
  const poolSize = Math.min(200, limit * 5);

  let query = db.from("Question")
    .select("id,subjectId,banca,year,level,statement,optionA,optionB,optionC,optionD,optionE,answer,explanation,source")
    .limit(poolSize);

  if (banca)     query = query.ilike("banca", `%${banca}%`);
  if (level)     query = query.eq("level", level);
  if (subjectId) query = query.eq("subjectId", subjectId);
  if (year)      query = query.eq("year", year);
  if (favIds?.length)  query = query.in("id", favIds);
  if (erroIds?.length) query = query.in("id", erroIds);

  // Exclui questões já vistas nesta sessão
  if (seenIds.length > 0 && !onlyFavs && !onlyErros) {
    query = query.not("id", "in", `(${seenIds.slice(-100).join(",")})`);
  }

  const { data: questions, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!questions?.length) {
    // Se esgotou questões não-vistas, retorna sem filtro de seen
    const { data: fallback } = await db
      .from("Question")
      .select("id,subjectId,banca,year,level,statement,optionA,optionB,optionC,optionD,optionE,answer,explanation,source")
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

  const body = await req.json();
  const { data, error } = await db.from("Question").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
