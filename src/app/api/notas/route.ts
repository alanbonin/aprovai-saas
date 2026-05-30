import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getConfig } from "@/lib/system-config";

/**
 * Anotações de estudo — armazenadas na tabela Note com subjectId = "__STUDY_NOTES__".
 * O campo content é um JSON array de: { id, subjectId, title, body, createdAt, updatedAt }
 */

const KV_KEY = "__STUDY_NOTES__";

interface StudyNote {
  id: string;
  subjectId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

async function loadNotes(userId: string): Promise<StudyNote[]> {
  const { data } = await db.from("Note").select("content")
    .eq("userId", userId).eq("subjectId", KV_KEY).single();
  if (!data?.content) return [];
  try { return JSON.parse(data.content) as StudyNote[]; } catch { return []; }
}

async function saveNotes(userId: string, notes: StudyNote[]): Promise<void> {
  const content = JSON.stringify(notes);
  await db.from("Note").upsert(
    { userId, subjectId: KV_KEY, content },
    { onConflict: "userId,subjectId" }
  );
}

/** GET /api/notas?subjectId=xxx — lista anotações (opcional: filtrar por matéria) */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const filterSubject = searchParams.get("subjectId");

  let notes = await loadNotes(dbUser.id);
  if (filterSubject) notes = notes.filter(n => n.subjectId === filterSubject);
  // Ordena por mais recente primeiro
  notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return NextResponse.json({ notes });
}

/** POST /api/notas — cria nova anotação */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { title, body, subjectId } = await req.json() as {
    title?: string; body?: string; subjectId?: string | null;
  };
  if (!title?.trim() && !body?.trim()) {
    return NextResponse.json({ error: "Título ou conteúdo obrigatório" }, { status: 400 });
  }

  const notes = await loadNotes(dbUser.id);

  // Limite de notas configurável
  const MAX_NOTES = await getConfig("limites.max_notas") as number;
  if (notes.length >= MAX_NOTES) {
    return NextResponse.json(
      { error: `Limite de ${MAX_NOTES} anotações atingido. Exclua anotações antigas para continuar.` },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();
  const note: StudyNote = {
    id: crypto.randomUUID(),
    subjectId: subjectId ?? null,
    title: title?.trim() ?? "",
    body: body?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
  notes.unshift(note);
  await saveNotes(dbUser.id, notes);

  return NextResponse.json(note, { status: 201 });
}

/** PATCH /api/notas — edita anotação existente */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id, title, body, subjectId } = await req.json() as {
    id: string; title?: string; body?: string; subjectId?: string | null;
  };
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const notes = await loadNotes(dbUser.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  notes[idx] = {
    ...notes[idx],
    ...(title !== undefined && { title: title.trim() }),
    ...(body !== undefined && { body: body.trim() }),
    ...(subjectId !== undefined && { subjectId }),
    updatedAt: new Date().toISOString(),
  };
  await saveNotes(dbUser.id, notes);

  return NextResponse.json(notes[idx]);
}

/** DELETE /api/notas — remove anotação por id */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const notes = await loadNotes(dbUser.id);
  const filtered = notes.filter(n => n.id !== id);
  await saveNotes(dbUser.id, filtered);

  return NextResponse.json({ ok: true });
}
