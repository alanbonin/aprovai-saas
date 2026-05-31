import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

const serviceDb = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/admin/biblioteca — lista todos os PDFs com info de matéria */
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data: docs } = await db
    .from("PdfDocument")
    .select("id, title, description, subjectId, topicId, storagePath, fileSize, pageCount, planLevel, createdAt, updatedAt, Subject(name, categoria)")
    .order("createdAt", { ascending: false });

  const { count } = await db.from("PdfDocument").select("*", { count: "exact", head: true });

  return NextResponse.json({ docs: docs ?? [], total: count ?? 0 });
}

/** PATCH /api/admin/biblioteca — atualiza metadados de um PDF */
export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json() as { id: string; title?: string; description?: string; planLevel?: string };
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { error } = await db.from("PdfDocument")
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/biblioteca — remove PDF do storage e do banco */
export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { data: doc } = await db.from("PdfDocument").select("storagePath").eq("id", id).single();

  if (doc?.storagePath) {
    await serviceDb.storage.from("pdfs").remove([doc.storagePath]);
  }

  await db.from("PdfDocument").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
