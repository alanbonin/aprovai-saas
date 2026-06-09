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
    color: body.color ?? "#6366f1",
    active: body.active ?? true,
    isPremium: body.isPremium ?? false,
    systemPrompt: body.systemPrompt ?? "",
    createdAt: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const { id } = body;
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const ALLOWED = ["name", "slug", "description", "categoria", "color", "active", "isPremium", "systemPrompt"];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await db.from("Agent").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await req.json();
  await db.from("Agent").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
