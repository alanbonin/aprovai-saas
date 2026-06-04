import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { log } from "@/lib/logger";

const KEY = "__POMODORO__";

interface PomodoroSession {
  startedAt: string;   // ISO
  durMin: number;      // duração real em minutos
  label?: string;      // rótulo opcional
}

function thisWeekSessions(sessions: PomodoroSession[]): PomodoroSession[] {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return sessions.filter(s => {
    const d = new Date(s.startedAt);
    return d >= weekStart && d < weekEnd;
  });
}

async function getNote(userId: string) {
  const { data } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", userId)
    .eq("subjectId", KEY)
    .maybeSingle();
  return data ?? null;
}

// ── GET — retorna sessões desta semana + totais ──────────────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const note = await getNote(dbUser.id);
  let allSessions: PomodoroSession[] = [];
  if (note?.content) {
    try { allSessions = JSON.parse(note.content) as PomodoroSession[]; } catch { /* skip */ }
  }

  const sessions = thisWeekSessions(allSessions);
  const now = new Date();

  const totalMin  = sessions.reduce((sum, s) => sum + (s.durMin ?? 0), 0);
  const totalHrs  = +(totalMin / 60).toFixed(2);
  const countToday = sessions.filter(s => {
    const d = new Date(s.startedAt);
    return d.getFullYear() === now.getFullYear()
        && d.getMonth()     === now.getMonth()
        && d.getDate()      === now.getDate();
  }).length;

  // Mais recentes primeiro
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return NextResponse.json({ sessions: sorted, totalMin, totalHrs, countToday });
}

// ── POST — salva uma sessão concluída ────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as Partial<PomodoroSession>;
  const durMin = typeof body.durMin === "number" && body.durMin > 0
    ? Math.round(body.durMin * 10) / 10   // 1 casa decimal
    : 25;

  const session: PomodoroSession = {
    startedAt: body.startedAt ?? new Date(Date.now() - durMin * 60_000).toISOString(),
    durMin,
    ...(body.label ? { label: body.label } : {}),
  };

  // Lê o Note existente ou cria um novo array
  const note = await getNote(dbUser.id);
  let allSessions: PomodoroSession[] = [];
  if (note?.content) {
    try { allSessions = JSON.parse(note.content) as PomodoroSession[]; } catch { /* start fresh */ }
  }

  // Adiciona no início, mantém máx 500 sessões
  allSessions = [session, ...allSessions].slice(0, 500);
  const content = JSON.stringify(allSessions);

  let dbError: string | null = null;
  if (note) {
    // Atualiza o Note existente
    const { error } = await db
      .from("Note")
      .update({ content, updatedAt: new Date().toISOString() })
      .eq("id", note.id);
    if (error) dbError = error.message;
  } else {
    // Cria novo Note
    const { error } = await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      subjectId: KEY,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (error) dbError = error.message;
  }

  if (dbError) {
    log.error("db.pomodoro_save_error", { table: "Note" }, dbError);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session }, { status: 201 });
}
