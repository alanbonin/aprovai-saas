import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

// ── PATCH — atualiza perfil ──────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Verifica que o perfil pertence ao usuário
  const { data: existing } = await db
    .from("StudentProfile")
    .select("id, userId, isDefault, cargo, orgao")
    .eq("id", id)
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  const body = await req.json() as Record<string, unknown>;

  // Campos permitidos para atualização
  const allowed = ["label", "cargo", "orgao", "dataProva", "horasEstudo",
    "nivelAtual", "disponibilidade", "modalidade", "dificuldades", "nomePreferido"];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // Recalcula label se cargo/orgao mudou e label não foi fornecido explicitamente
  const existingTyped = existing as { id: string; userId: string; isDefault: boolean; cargo: string | null; orgao: string | null };
  if (!("label" in body) && ("cargo" in body || "orgao" in body)) {
    const cargo = (body.cargo as string | undefined) ?? existingTyped.cargo ?? "";
    const orgao = (body.orgao as string | undefined) ?? existingTyped.orgao ?? "";
    updates.label = [cargo, orgao].filter(Boolean).join(" — ") || "Perfil sem nome";
  }

  const { data: profile, error } = await db
    .from("StudentProfile")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  return NextResponse.json({ profile });
}

// ── DELETE — exclui perfil ───────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { data: existing } = await db
    .from("StudentProfile")
    .select("id, userId, isDefault")
    .eq("id", id)
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  // Não permite excluir o perfil padrão
  if (existing.isDefault) {
    return NextResponse.json({ error: "O perfil principal não pode ser excluído." }, { status: 400 });
  }

  // Se era o perfil ativo, reseta activeProfileId para null (vai cair no default)
  const { data: userData } = await db.from("User").select("activeProfileId").eq("id", dbUser.id).maybeSingle();
  if (userData?.activeProfileId === id) {
    await db.from("User").update({ activeProfileId: null }).eq("id", dbUser.id);
  }

  const { error } = await db.from("StudentProfile").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
