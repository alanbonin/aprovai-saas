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

// POST /api/biblioteca/upload — admin faz upload de PDF
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file      = formData.get("file") as File | null;
  const title     = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const subjectId = formData.get("subjectId") as string | null;
  const topicId   = formData.get("topicId") as string | null;
  const planLevel = (formData.get("planLevel") as string) ?? "trial";

  if (!file || !title) {
    return NextResponse.json({ error: "file e title são obrigatórios" }, { status: 400 });
  }

  if (file.size > 52_428_800) {
    return NextResponse.json({ error: "Arquivo muito grande (máx 50MB)" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Apenas arquivos PDF são permitidos" }, { status: 400 });
  }

  // Gera path único no storage
  const ext = "pdf";
  const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50);
  const storagePath = `${subjectId ?? "geral"}/${Date.now()}-${safeName}.${ext}`;

  // Upload para Supabase Storage (usando service role)
  const supabase = await createClient();
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("pdfs")
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    log.error("biblioteca.upload_error", { title }, uploadError);
    return NextResponse.json({ error: "Erro no upload: " + uploadError.message }, { status: 500 });
  }

  // Salva metadados no banco
  const id = crypto.randomUUID();
  const { error: dbError } = await db.from("PdfDocument").insert({
    id,
    title: title.trim(),
    description: description?.trim() || null,
    subjectId: subjectId || null,
    topicId: topicId || null,
    storagePath,
    fileSize: file.size,
    planLevel,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (dbError) {
    // Limpa o arquivo do storage se falhou no banco
    await supabase.storage.from("pdfs").remove([storagePath]);
    log.error("biblioteca.db_insert_error", { title }, dbError);
    return NextResponse.json({ error: "Erro ao salvar documento" }, { status: 500 });
  }

  log.info("biblioteca.doc_uploaded", { docId: id, title, subjectId, planLevel });
  return NextResponse.json({ id, title, storagePath }, { status: 201 });
}

// DELETE /api/biblioteca/upload?id=xxx — admin remove PDF
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { data: doc } = await db.from("PdfDocument").select("storagePath").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const supabase = await createClient();
  await supabase.storage.from("pdfs").remove([doc.storagePath]);
  await db.from("PdfDocument").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
