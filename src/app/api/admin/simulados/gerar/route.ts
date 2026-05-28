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

// Simulados agora são gerados on-the-fly para o aluno via /api/simulado/gerar
// Este endpoint foi desativado pois a tabela "Simulado" não existe no banco
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    { error: "Geração de simulados pré-criados desativada. Use /api/simulado/gerar para gerar on-the-fly." },
    { status: 410 }
  );
}
