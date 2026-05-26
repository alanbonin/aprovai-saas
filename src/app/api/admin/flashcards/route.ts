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
    .from("FlashcardSet")
    .select("id, name, subjectId, cards, createdAt")
    .order("createdAt", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = await req.json();

  // Resolve o userId do admin logado
  const { createClient: createSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: adminRecord } = await db.from("User").select("id").eq("supabaseId", authUser!.id).maybeSingle();
  if (!adminRecord?.id) return NextResponse.json({ error: "Admin não encontrado" }, { status: 500 });

  const { data, error } = await db.from("FlashcardSet").insert({
    id: crypto.randomUUID(),
    name: body.name,
    subjectId: body.subjectId,
    cards: body.cards ?? [],
    userId: adminRecord.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id, ...updates } = await req.json();
  const { data, error } = await db.from("FlashcardSet").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await req.json();
  await db.from("FlashcardSet").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
