import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { questionId, correct } = await req.json();

  const { data: existing } = await db
    .from("Progress")
    .select("*")
    .eq("userId", dbUser.id)
    .eq("questionId", questionId)
    .single();

  const easeFactor = existing
    ? correct ? Math.min(2.5, existing.easeFactor + 0.1) : Math.max(1.3, existing.easeFactor - 0.2)
    : 2.5;

  const interval = existing
    ? correct ? Math.round(existing.interval * easeFactor) : 1
    : 1;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  if (existing) {
    await db.from("Progress").update({
      correct, interval, easeFactor,
      nextReview: nextReview.toISOString(),
      reviewedAt: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await db.from("Progress").insert({
      userId: dbUser.id, questionId, correct, interval, easeFactor,
      nextReview: nextReview.toISOString(),
      reviewedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
