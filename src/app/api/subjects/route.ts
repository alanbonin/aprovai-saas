import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/subjects
 * Retorna matérias com id, name, categoria.
 * ?mine=true → filtra apenas as matérias da lista de estudo do aluno (StudentSubject).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mineOnly = searchParams.get("mine") === "true";

  if (mineOnly) {
    // Busca somente as matérias que o aluno adicionou na sua lista de estudo
    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { data: studentSubjects } = await db
      .from("StudentSubject")
      .select("subjectId")
      .eq("userId", dbUser.id);

    const subjectIds = (studentSubjects ?? []).map((s: { subjectId: string }) => s.subjectId);

    if (subjectIds.length === 0) {
      return NextResponse.json({ subjects: [] });
    }

    const { data: subjects } = await db
      .from("Subject")
      .select("id, name, categoria, description")
      .in("id", subjectIds)
      .order("categoria", { ascending: true })
      .order("ordem", { ascending: true });

    return NextResponse.json({ subjects: subjects ?? [] });
  }

  // Padrão: retorna todas (usado em perfil, admin, etc.)
  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, categoria, description")
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true });

  return NextResponse.json({ subjects: subjects ?? [] });
}
