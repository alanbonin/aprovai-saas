import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// PATCH /api/admin/topics/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, slug, description, ordem } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name e slug são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await db
    .from("Topic")
    .update({ name, slug, description: description || null, ordem })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug já existe nessa matéria" }, { status: 409 });
    }
    log.error("admin.topics.update_error", { topicId: id }, error);
    return NextResponse.json({ error: "Erro interno ao atualizar tópico" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/admin/topics/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await db.from("Topic").delete().eq("id", id);
  if (error) {
    log.error("admin.topics.delete_error", { topicId: id }, error);
    return NextResponse.json({ error: "Erro interno ao deletar tópico" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
