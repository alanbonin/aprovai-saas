import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__DIARIO__";

export interface DiarioEntry {
  date: string;          // YYYY-MM-DD
  hours: number;         // e.g. 2.5
  mood: number;          // 1–5
  notes: string;
  subjectIds: string[];
}

async function getEntries(userId: string): Promise<DiarioEntry[]> {
  const { data } = await db
    .from("Note")
    .select("content")
    .eq("userId", userId)
    .eq("subjectId", PREFIX)
    .single();
  try { return data?.content ? JSON.parse(data.content) : []; }
  catch { return []; }
}

async function saveEntries(userId: string, entries: DiarioEntry[]) {
  const content = JSON.stringify(entries);
  const { data: ex } = await db
    .from("Note")
    .select("id")
    .eq("userId", userId)
    .eq("subjectId", PREFIX)
    .single();
  if (ex?.id) {
    await db.from("Note").update({ content }).eq("id", ex.id);
  } else {
    await db.from("Note").insert({ userId, subjectId: PREFIX, content });
  }
}

/** GET /api/workspace/diario?days=90 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(365, parseInt(searchParams.get("days") ?? "90", 10));

  const entries = await getEntries(dbUser.id);

  // Filter to requested window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = entries.filter(e => e.date >= cutoffStr);

  // Stats
  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);
  const totalDays   = filtered.length;
  const avgMood     = totalDays > 0
    ? +(filtered.reduce((s, e) => s + e.mood, 0) / totalDays).toFixed(1)
    : 0;

  // Current streak
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  const dateSet = new Set(entries.map(e => e.date));
  let cursor = new Date();
  while (true) {
    const d = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(d)) {
      // Allow today to not break streak if it's early
      if (d === today) { cursor.setDate(cursor.getDate() - 1); continue; }
      break;
    }
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Fetch subjects for client
  const { data: subjects } = await db.from("Subject").select("id, name").order("name");

  return NextResponse.json({
    entries: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    stats: { totalHours: +totalHours.toFixed(1), totalDays, avgMood, streak },
    subjects: subjects ?? [],
  });
}

/** POST /api/workspace/diario — upsert entry for a date */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as Partial<DiarioEntry>;
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const hours = Math.min(24, Math.max(0, +(body.hours ?? 0)));
  const mood  = Math.min(5, Math.max(1, Math.round(body.mood ?? 3)));
  const notes = (body.notes ?? "").slice(0, 500);
  const subjectIds: string[] = Array.isArray(body.subjectIds) ? body.subjectIds : [];

  const entries = await getEntries(dbUser.id);
  const idx = entries.findIndex(e => e.date === date);
  const entry: DiarioEntry = { date, hours, mood, notes, subjectIds };
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);

  // Cap at 730 entries (2 years)
  if (entries.length > 730) entries.splice(730);

  await saveEntries(dbUser.id, entries);
  return NextResponse.json({ ok: true, entry });
}

/** DELETE /api/workspace/diario?date=YYYY-MM-DD */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date obrigatório" }, { status: 400 });

  const entries = await getEntries(dbUser.id);
  const updated = entries.filter(e => e.date !== date);
  await saveEntries(dbUser.id, updated);
  return NextResponse.json({ ok: true });
}
