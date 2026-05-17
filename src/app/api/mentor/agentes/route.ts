import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { agentId, action } = await req.json();
  const maxAgents = dbUser.subscription?.plan?.maxAgents ?? 1;

  if (action === "add") {
    const { count } = await db.from("UserAgent").select("*", { count: "exact", head: true }).eq("userId", dbUser.id);
    if ((count ?? 0) >= maxAgents && maxAgents < 999) {
      return NextResponse.json({ error: `Seu plano permite no máximo ${maxAgents} mentor${maxAgents > 1 ? "es" : ""}` }, { status: 403 });
    }
    await db.from("UserAgent").upsert(
      { id: crypto.randomUUID(), userId: dbUser.id, agentId, createdAt: new Date().toISOString() },
      { onConflict: "userId,agentId", ignoreDuplicates: true }
    );
  } else {
    await db.from("UserAgent").delete().eq("userId", dbUser.id).eq("agentId", agentId);
  }

  return NextResponse.json({ ok: true });
}
