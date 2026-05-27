import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Verifica se usuário é ADMIN
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// POST /api/admin/topics — cria novo tópico
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subjectId, name, slug, description, ordem } = body;

  if (!subjectId || !name || !slug) {
    return NextResponse.json({ error: "subjectId, name e slug são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await db
    .from("Topic")
    .insert({ subjectId, name, slug, description: description || null, ordem: ordem ?? 1 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug já existe nessa matéria" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// GET /api/admin/topics — lista tópicos (com filtro opcional por subjectId)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subjectId = req.nextUrl.searchParams.get("subjectId");

  let query = db.from("Topic").select("*").order("subjectId").order("ordem");
  if (subjectId) query = query.eq("subjectId", subjectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
