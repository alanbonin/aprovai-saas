import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const ADMIN_PREFIX = "__ADMIN_NOTIF__";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

/** GET /api/admin/anuncio — lista anúncios publicados */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { data } = await db
    .from("Note")
    .select("id, content, updatedAt")
    .eq("subjectId", ADMIN_PREFIX)
    .order("updatedAt", { ascending: false })
    .limit(20);

  const anuncios = (data ?? []).map(n => {
    try {
      return { id: n.id, updatedAt: n.updatedAt, ...JSON.parse(n.content ?? "{}") };
    } catch {
      return { id: n.id, updatedAt: n.updatedAt, title: "—", message: "" };
    }
  });

  return NextResponse.json({ anuncios });
}

/** POST /api/admin/anuncio — publica novo anúncio */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { title, message } = await req.json() as { title?: string; message?: string };
  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const content = JSON.stringify({ title: title.trim(), message: message?.trim() ?? "" });
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("Note")
    .insert({ id: crypto.randomUUID(), userId: admin.id, subjectId: ADMIN_PREFIX, content, createdAt: now, updatedAt: now })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

/** DELETE /api/admin/anuncio — remove anúncio por id */
export async function DELETE(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await req.json() as { id: string };
  await db.from("Note").delete().eq("id", id).eq("subjectId", ADMIN_PREFIX);
  return NextResponse.json({ ok: true });
}
