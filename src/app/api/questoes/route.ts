import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const banca = searchParams.get("banca");
  const level = searchParams.get("level");
  const subjectId = searchParams.get("subjectId");
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const onlyFavs = searchParams.get("favoritos") === "1";
  const onlyErros = searchParams.get("erros") === "1";
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  const dbUser = await getUserWithPlan(user.id);

  // Favoritos filter — resolve IDs first
  let favIds: number[] | null = null;
  if (onlyFavs) {
    if (dbUser) {
      const { data: note } = await db.from("Note").select("content")
        .eq("userId", dbUser.id).eq("subjectId", "__FAV_Q__").single();
      favIds = note?.content ? JSON.parse(note.content) : [];
    }
    if (!favIds || favIds.length === 0) return NextResponse.json({ questions: [] });
  }

  // Erros filter — questions the student last answered incorrectly
  let erroIds: number[] | null = null;
  if (onlyErros && dbUser) {
    const { data: wrongProgress } = await db
      .from("Progress")
      .select("questionId")
      .eq("userId", dbUser.id)
      .eq("correct", false);
    // Exclude questions that were later answered correctly
    const { data: rightProgress } = await db
      .from("Progress")
      .select("questionId")
      .eq("userId", dbUser.id)
      .eq("correct", true);
    const rightIds = new Set((rightProgress ?? []).map(p => p.questionId));
    erroIds = (wrongProgress ?? [])
      .map(p => p.questionId)
      .filter(id => !rightIds.has(id));
    if (erroIds.length === 0) return NextResponse.json({ questions: [] });
  }

  let query = db.from("Question").select("*").limit(limit);
  if (banca) query = query.ilike("banca", banca);
  if (level) query = query.eq("level", level);
  if (subjectId) query = query.eq("subjectId", subjectId);
  if (year) query = query.eq("year", year);
  if (favIds && favIds.length > 0) query = query.in("id", favIds);
  if (erroIds && erroIds.length > 0) query = query.in("id", erroIds);

  const { data: questions, error } = await query.order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // shuffle so it feels random
  const shuffled = (questions ?? []).sort(() => Math.random() - 0.5);
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
