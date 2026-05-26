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

// GET — lista questões com filtros e paginação (admin)
export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const banca = searchParams.get("banca");
  const level = searchParams.get("level");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("Question")
    .select("id, statement, answer, level, banca, year, subjectId, createdAt", { count: "exact" });

  if (subjectId) query = query.eq("subjectId", subjectId);
  if (banca) query = query.ilike("banca", `%${banca}%`);
  if (level) query = query.eq("level", level);
  if (search) query = query.ilike("statement", `%${search}%`);

  const { data: questions, count, error } = await query
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  return NextResponse.json({
    questions: questions ?? [],
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

// PATCH — edita uma questão por ID
export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id, ...fields } = await req.json() as { id: number; [key: string]: unknown };
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const { data, error } = await db.from("Question").update(fields).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove uma questão por ID
export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await req.json() as { id: number };
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const { error } = await db.from("Question").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
