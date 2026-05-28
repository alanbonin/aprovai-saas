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

// Simulados pré-cadastrados foram substituídos por geração on-the-fly via /api/simulado/gerar
// Estas rotas retornam respostas vazias para compatibilidade com código legado

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json([]);
}

export async function PATCH() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
