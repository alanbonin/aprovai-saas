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
 * Individual:  { id: number; aprovado: boolean }
 * Em lote:     { ids: number[]; aprovado: boolean }
 */
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json() as { id?: number; ids?: number[]; aprovado: boolean };
  const { id, ids, aprovado } = body;

  if (typeof aprovado !== "boolean") {
    return NextResponse.json({ error: "aprovado é obrigatório" }, { status: 400 });
  }

  // Lote
  if (ids && ids.length > 0) {
    const { error } = await db
      .from("Question")
      .update({ aprovado })
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: ids.length });
  }

  // Individual
  if (!id) return NextResponse.json({ error: "id ou ids são obrigatórios" }, { status: 400 });

  const { data, error } = await db
    .from("Question")
    .update({ aprovado })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
