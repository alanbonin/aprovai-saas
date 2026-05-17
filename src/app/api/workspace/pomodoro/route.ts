import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__POMODORO_SESSION__";

interface PomodoroSession {
  startedAt: string;   // ISO
  durMin: number;      // 25 | 50 | custom
  label?: string;      // optional subject/task name
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

// ── GET — retorna sessões desta semana + totais ──────────────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { start, end } = getWeekBounds();

  // Busca notas de sessão desta semana
  const { data: notes } = await db
    .from("Note")
    .select("content, createdAt")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .gte("createdAt", start.toISOString())
    .lte("createdAt", end.toISOString())
    .order("createdAt", { ascending: false });

  const sessions: (PomodoroSession & { savedAt: string })[] = [];
  for (const n of notes ?? []) {
    try {
      const s = JSON.parse(n.content) as PomodoroSession;
      sessions.push({ ...s, savedAt: n.createdAt });
    } catch { /* skip invalid */ }
  }

  const totalMin  = sessions.reduce((sum, s) => sum + (s.durMin ?? 0), 0);
  const totalHrs  = +(totalMin / 60).toFixed(2);
  const countToday = sessions.filter(s => {
    const d = new Date(s.startedAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear()
        && d.getMonth()     === now.getMonth()
        && d.getDate()      === now.getDate();
  }).length;

  return NextResponse.json({ sessions, totalMin, totalHrs, countToday });
}

// ── POST — salva uma sessão concluída ────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as Partial<PomodoroSession>;
  const durMin = typeof body.durMin === "number" && body.durMin > 0 ? body.durMin : 25;

  const session: PomodoroSession = {
    startedAt: body.startedAt ?? new Date(Date.now() - durMin * 60_000).toISOString(),
    durMin,
    label: body.label ?? undefined,
  };

  const { error } = await db.from("Note").insert({
    id: crypto.randomUUID(),
    userId: dbUser.id,
    subjectId: PREFIX,
    content: JSON.stringify(session),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    console.error("[pomodoro] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session }, { status: 201 });
}
