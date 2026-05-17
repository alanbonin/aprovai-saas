import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const PREFIX = "__REPORTE_QUESTAO__";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

/**
 * GET /api/admin/questoes/reportes
 * Lista todos os reportes de questões pendentes.
 *
 * PATCH /api/admin/questoes/reportes
 * Resolve um reporte (status: "resolvido" | "ignorado").
 */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: notes } = await db
    .from("Note")
    .select("id, subjectId, content, userId")
    .like("subjectId", `${PREFIX}%`)
    .order("id", { ascending: false });

  const reportes = (notes ?? []).flatMap(note => {
    try {
      const r = JSON.parse(note.content);
      return [{ noteId: note.id, ...r }];
    } catch {
      return [];
    }
  });

  const pendentes = reportes.filter(r => r.status === "pendente");
  const resolvidos = reportes.filter(r => r.status !== "pendente");

  return NextResponse.json({ pendentes, resolvidos, total: reportes.length });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { noteId, status } = await req.json() as { noteId: string; status: "resolvido" | "ignorado" };
  if (!noteId || !["resolvido", "ignorado"].includes(status)) {
    return NextResponse.json({ error: "noteId e status válido são obrigatórios" }, { status: 400 });
  }

  const { data: note } = await db.from("Note").select("content").eq("id", noteId).maybeSingle();
  if (!note) return NextResponse.json({ error: "Reporte não encontrado" }, { status: 404 });

  let content: Record<string, unknown>;
  try {
    content = JSON.parse(note.content) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Reporte corrompido" }, { status: 400 });
  }

  content.status = status;
  content.resolvedAt = new Date().toISOString();

  await db.from("Note").update({ content: JSON.stringify(content) }).eq("id", noteId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { noteId } = await req.json() as { noteId: string };
  if (!noteId) return NextResponse.json({ error: "noteId obrigatório" }, { status: 400 });

  await db.from("Note").delete().eq("id", noteId);
  return NextResponse.json({ ok: true });
}
