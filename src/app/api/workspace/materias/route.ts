import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Buscar perfil para saber a categoria
  const { data: profile } = await db.from("StudentProfile").select("*").eq("userId", dbUser.id).single();

  // Buscar agentes do aluno para pegar categorias/areas
  const { data: userAgents } = await db.from("UserAgent").select("agentId").eq("userId", dbUser.id);
  const agentIds = (userAgents ?? []).map((ua: { agentId: string }) => ua.agentId);
  const { data: agents } = agentIds.length
    ? await db.from("Agent").select("categoria, area").in("id", agentIds)
    : { data: [] };

  // Usa categoria se disponível, senão area (seed pode ter só um dos dois)
  const categorias = [...new Set(
    (agents ?? [])
      .map((a: { categoria: string | null; area: string | null }) => a.categoria || a.area)
      .filter(Boolean)
  )];

  // Matérias da categoria/area dos agentes selecionados
  // — se não houver filtro, usa os StudentSubject existentes para não retornar tudo
  if (categorias.length === 0) {
    const { data: studentSubjects } = await db
      .from("StudentSubject")
      .select("subjectId, Subject(id, name, slug, description)")
      .eq("userId", dbUser.id);
    const subjects = (studentSubjects ?? [])
      .map((ss: { subjectId: string; Subject: unknown }) => {
        const s = ss.Subject as { id: string; name: string; slug: string; description: string }[] | null;
        return Array.isArray(s) ? s[0] : s;
      })
      .filter(Boolean);
    return NextResponse.json({ subjects });
  }

  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, slug, description")
    .in("categoria", categorias as string[])
    .order("ordem");

  return NextResponse.json({ subjects: subjects ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { subjectIds } = await req.json();

  // Remover antigas e inserir novas
  await db.from("StudentSubject").delete().eq("userId", dbUser.id);

  if (subjectIds && subjectIds.length > 0) {
    const now = new Date().toISOString();
    await db.from("StudentSubject").insert(
      subjectIds.map((id: string) => ({
        id: crypto.randomUUID(),
        userId: dbUser.id,
        subjectId: id,
        fromEdital: false,
        createdAt: now,
      }))
    );
  }

  // Retornar matérias confirmadas
  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, slug, description")
    .in("id", subjectIds ?? []);

  return NextResponse.json({ subjects: subjects ?? [] });
}
