import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__SESSOES__";
const MAX_SESSOES = 100;

interface Sessao {
  id: string;
  subjectId: string | null;
  subjectName: string | null;
  duracaoMin: number;
  questoesRespondidas: number;
  nota: string;
  createdAt: string;
}

/**
 * GET /api/workspace/sessao
 * Lista sessões de estudo do aluno + stats.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { data: note } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let sessoes: Sessao[] = [];
  try { sessoes = JSON.parse(note?.content ?? "[]"); } catch { /* ignore */ }

  const totalMin = sessoes.reduce((s, r) => s + r.duracaoMin, 0);
  const totalSessoes = sessoes.length;
  const mediaDuracao = totalSessoes > 0 ? Math.round(totalMin / totalSessoes) : 0;

  // Last 7 days stats
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recent = sessoes.filter(s => s.createdAt >= sevenDaysAgo);
  const minUltSemana = recent.reduce((s, r) => s + r.duracaoMin, 0);

  // By subject
  const bySubject: Record<string, { name: string; total: number; min: number }> = {};
  for (const s of sessoes) {
    const key = s.subjectId ?? "__sem__";
    if (!bySubject[key]) bySubject[key] = { name: s.subjectName ?? "Sem matéria", total: 0, min: 0 };
    bySubject[key].total++;
    bySubject[key].min += s.duracaoMin;
  }

  const topSubjects = Object.values(bySubject)
    .sort((a, b) => b.min - a.min)
    .slice(0, 5);

  return NextResponse.json({
    sessoes: sessoes.slice(0, 30),
    stats: { totalMin, totalSessoes, mediaDuracao, minUltSemana },
    topSubjects,
  });
}

/**
 * POST /api/workspace/sessao
 * Registra uma nova sessão de estudo.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { subjectId, duracaoMin, questoesRespondidas = 0, nota = "" } =
    await req.json() as {
      subjectId?: string; duracaoMin: number;
      questoesRespondidas?: number; nota?: string;
    };

  if (!duracaoMin || duracaoMin < 1) {
    return NextResponse.json({ error: "Duração inválida" }, { status: 400 });
  }

  // Load existing
  const { data: note } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let sessoes: Sessao[] = [];
  try { sessoes = JSON.parse(note?.content ?? "[]"); } catch { /* ignore */ }

  // Fetch subject name
  let subjectName: string | null = null;
  if (subjectId) {
    const { data: subj } = await db.from("Subject").select("name").eq("id", subjectId).single();
    subjectName = subj?.name ?? null;
  }

  const newSessao: Sessao = {
    id: crypto.randomUUID(),
    subjectId: subjectId ?? null,
    subjectName,
    duracaoMin,
    questoesRespondidas,
    nota: nota.slice(0, 300),
    createdAt: new Date().toISOString(),
  };

  sessoes = [newSessao, ...sessoes].slice(0, MAX_SESSOES);
  const content = JSON.stringify(sessoes);

  if (note?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", note.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      subjectId: PREFIX,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ sessao: newSessao }, { status: 201 });
}
