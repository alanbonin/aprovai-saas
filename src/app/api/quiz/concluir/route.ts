import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ ok: false });

  const todayStr = new Date().toISOString().slice(0, 10);
  const key = `__QUIZ_HOJE__:${todayStr}`;
  const now = new Date().toISOString();

  const { data: ex } = await db.from("Note").select("id").eq("userId", dbUser.id).eq("subjectId", key).maybeSingle();
  if (!ex) {
    await db.from("Note").insert({ id: crypto.randomUUID(), userId: dbUser.id, subjectId: key, content: "1", createdAt: now, updatedAt: now });
  }
  return NextResponse.json({ ok: true });
}
