import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ materiais: [], questoes: [], flashcards: [] });

  const [
    { data: materiais },
    { data: questoes },
    { data: flashcards },
  ] = await Promise.all([
    db.from("Material").select("id, title, type, description, fileUrl, isPremium").eq("subjectId", subjectId).eq("active", true).order("createdAt"),
    db.from("Question").select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year, level").eq("subjectId", subjectId).limit(50),
    db.from("Flashcard").select("id, front, back").eq("subjectId", subjectId).limit(100),
  ]);

  return NextResponse.json({
    materiais: materiais ?? [],
    questoes: questoes ?? [],
    flashcards: flashcards ?? [],
  });
}
