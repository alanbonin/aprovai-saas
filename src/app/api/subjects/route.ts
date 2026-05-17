import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/subjects
 * Retorna todas as matérias com id, name, categoria — para seletores e perfil.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, categoria, description")
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true });

  return NextResponse.json({ subjects: subjects ?? [] });
}
