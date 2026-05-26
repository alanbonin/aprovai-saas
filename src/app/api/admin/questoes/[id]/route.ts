import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// GET — retorna uma questão completa
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const { data, error } = await db.from("Question").select("*").eq("id", parseInt(id, 10)).maybeSingle();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH — atualiza uma questão
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const { data, error } = await db
    .from("Question")
    .update(body)
    .eq("id", parseInt(id, 10))
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove uma questão e seus progressos
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const numId = parseInt(id, 10);

  // Remove progresso antes (FK)
  await db.from("Progress").delete().eq("questionId", numId);

  const { error } = await db.from("Question").delete().eq("id", numId);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
