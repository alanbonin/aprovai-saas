import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void id;
  return NextResponse.json({ error: "Simulado não encontrado" }, { status: 404 });
}

// ── PATCH — salva resultado final de um SimuladoHistory ──────────────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await params;
  const body = await req.json() as { correct?: number; timeSecs?: number };

  // Verifica propriedade do registro
  const { data: existing } = await db
    .from("SimuladoHistory")
    .select("id")
    .eq("id", id)
    .eq("userId", dbUser.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { data, error } = await db
    .from("SimuladoHistory")
    .update({ correct: body.correct ?? 0, timeSecs: body.timeSecs ?? 0 })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data);
}
