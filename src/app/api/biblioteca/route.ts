import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserWithPlan } from "@/lib/db";

// GET /api/biblioteca — lista PDFs disponíveis para o aluno
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const subjectId = searchParams.get("subjectId");
  const topicId   = searchParams.get("topicId");
  const search    = searchParams.get("q");

  let query = db
    .from("PdfDocument")
    .select("id, title, description, subjectId, topicId, fileSize, pageCount, planLevel, createdAt")
    .order("createdAt", { ascending: false });

  if (subjectId) query = query.eq("subjectId", subjectId);
  if (topicId)   query = query.eq("topicId", topicId);
  if (search)    query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Erro ao listar documentos" }, { status: 500 });

  return NextResponse.json(data ?? []);
}
