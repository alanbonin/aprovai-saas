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

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { data } = await db
    .from("Material")
    .select("id, title, description, type, subjectId, banca, fileUrl, fileSize, isPremium, active, createdAt")
    .order("createdAt", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = await req.json();
  const { data, error } = await db.from("Material").insert({
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description ?? null,
    type: body.type,
    subjectId: body.subjectId ?? null,
    banca: body.banca ?? null,
    fileUrl: body.fileUrl ?? null,
    fileSize: body.fileSize ?? null,
    isPremium: body.isPremium ?? false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id, ...updates } = await req.json();
  const { data, error } = await db.from("Material").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await req.json();
  const { data: mat } = await db.from("Material").select("fileUrl").eq("id", id).maybeSingle();

  // Remove arquivo do storage se existir
  if (mat?.fileUrl) {
    const path = mat.fileUrl.split("/storage/v1/object/public/materiais/")[1];
    if (path) {
      await db.storage.from("materiais").remove([path]);
    }
  }

  await db.from("Material").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
