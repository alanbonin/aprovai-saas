import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { minutos } = await req.json() as { minutos: number };
  if (!minutos || minutos < 1) return NextResponse.json({ ok: true });

  const todayStr = new Date().toISOString().slice(0, 10);
  const key = `__PDF_LEITURA__:${todayStr}`;
  const now = new Date().toISOString();

  const { data: ex } = await db.from("Note").select("id, content").eq("userId", dbUser.id).eq("subjectId", key).maybeSingle();

  if (ex?.id) {
    const prev = ex.content ? (JSON.parse(ex.content) as { minutos?: number }).minutos ?? 0 : 0;
    await db.from("Note").update({ content: JSON.stringify({ minutos: prev + minutos }), updatedAt: now }).eq("id", ex.id);
  } else {
    await db.from("Note").insert({ id: crypto.randomUUID(), userId: dbUser.id, subjectId: key, content: JSON.stringify({ minutos }), createdAt: now, updatedAt: now });
  }

  return NextResponse.json({ ok: true, minutos });
}
