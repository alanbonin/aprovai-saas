import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

/**
 * PATCH /api/admin/questoes/aprovar
 * Aprova ou rejeita uma questão.
 * Body: { id: number; aprovado: boolean }
 */
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json() as { id: number; aprovado: boolean };
  const { id, aprovado } = body;

  if (!id || typeof aprovado !== "boolean") {
    return NextResponse.json({ error: "id e aprovado são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await db
    .from("Question")
    .update({ aprovado })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
