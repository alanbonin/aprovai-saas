import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getConfig } from "@/lib/system-config";

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

  if (!questionId || typeof questionId !== "number") {
    return NextResponse.json({ error: "questionId inválido" }, { status: 400 });
  }

  // Validar existência da questão antes de favoritar (evita IDs fantasma)
  if (action === "add") {
    const { data: exists } = await db
      .from("Question")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();
    if (!exists) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
    }
  }

  const favs = await getFavs(dbUser.id);

  // Limite de favoritos configurável
  const maxFavoritos = await getConfig("limites.max_favoritos") as number;
  if (action === "add" && favs.length >= maxFavoritos) {
    return NextResponse.json({ error: `Limite de ${maxFavoritos} favoritos atingido` }, { status: 422 });
  }

  let updated: number[];
  if (action === "add") updated = favs.includes(questionId) ? favs : [...favs, questionId];
  else updated = favs.filter(id => id !== questionId);

  await saveFavs(dbUser.id, updated);
  return NextResponse.json({ favoritos: updated });
}
