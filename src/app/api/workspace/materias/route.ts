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

  // Buscar agentes do aluno para pegar categorias
  const { data: userAgents } = await db.from("UserAgent").select("agentId").eq("userId", dbUser.id);
  const agentIds = (userAgents ?? []).map((ua: { agentId: string }) => ua.agentId);
  const { data: agents } = agentIds.length
    ? await db.from("Agent").select("categoria").in("id", agentIds)
    : { data: [] };

  const categorias = [...new Set((agents ?? []).map((a: { categoria: string | null }) => a.categoria).filter(Boolean))];

  // Matérias da categoria dos agentes selecionados
  let query = db.from("Subject").select("id, name, slug, description").order("ordem");
  if (categorias.length > 0) {
    query = query.in("categoria", categorias as string[]);
  }

  const { data: subjects } = await query;
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
    await db.from("StudentSubject").insert(
      subjectIds.map((id: string) => ({ userId: dbUser.id, subjectId: id, fromEdital: false }))
    );
  }

  // Retornar matérias confirmadas
  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, slug, description")
    .in("id", subjectIds ?? []);

  return NextResponse.json({ subjects: subjects ?? [] });
}
