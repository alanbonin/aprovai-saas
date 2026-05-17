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

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { data, error } = await db.from("Agent").insert({
    id: crypto.randomUUID(),
    name: body.name,
    slug: body.slug,
    description: body.description ?? "",
    categoria: body.categoria ?? null,
    banca: body.banca ?? null,
    color: body.color ?? "#6366f1",
    active: body.active ?? true,
    isPremium: body.isPremium ?? false,
    systemPrompt: body.systemPrompt ?? "",
    createdAt: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const { data, error } = await db.from("Agent").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await req.json();
  await db.from("Agent").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
