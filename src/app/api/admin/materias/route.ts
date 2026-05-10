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
  const { data, error } = await db.from("Subject").insert({
    name: body.name, slug: body.slug,
    categoria: body.categoria ?? null,
    description: body.description ?? null,
    ordem: body.ordem ?? 0,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id, ...updates } = await req.json();
  const { data, error } = await db.from("Subject").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await req.json();
  await db.from("Subject").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
