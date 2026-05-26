import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

// ── POST — ativa um perfil como o perfil atual ───────────────────────────────
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Verifica que o perfil pertence ao usuário
  const { data: profile } = await db
    .from("StudentProfile")
    .select("id, label, cargo, orgao")
    .eq("id", id)
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  // Atualiza activeProfileId no User
  const { error } = await db
    .from("User")
    .update({ activeProfileId: id })
    .eq("id", dbUser.id);

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  return NextResponse.json({ ok: true, activeProfileId: id, profile });
}
