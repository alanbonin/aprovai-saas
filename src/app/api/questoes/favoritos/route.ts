import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__FAV_Q__";

async function getFavs(userId: string): Promise<number[]> {
  const { data } = await db.from("Note").select("content")
    .eq("userId", userId).eq("subjectId", PREFIX).maybeSingle();
  try { return data?.content ? JSON.parse(data.content) : []; }
  catch { return []; }
}

async function saveFavs(userId: string, ids: number[]) {
  const content = JSON.stringify(ids);
  const { data: ex } = await db.from("Note").select("id").eq("userId", userId).eq("subjectId", PREFIX).maybeSingle();
  if (ex?.id) await db.from("Note").update({ content }).eq("id", ex.id);
  else await db.from("Note").insert({ userId, subjectId: PREFIX, content });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ favoritos: await getFavs(dbUser.id) });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { questionId, action } = await req.json() as { questionId: number; action: "add" | "remove" };
  const favs = await getFavs(dbUser.id);

  let updated: number[];
  if (action === "add") updated = favs.includes(questionId) ? favs : [...favs, questionId];
  else updated = favs.filter(id => id !== questionId);

  await saveFavs(dbUser.id, updated);
  return NextResponse.json({ favoritos: updated });
}
