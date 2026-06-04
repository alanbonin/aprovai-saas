import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

const PREFIX          = "__METAS_SEMANAIS__";
const POMODORO_PREFIX = "__POMODORO_SESSION__";

interface MetasSemana {
  questoesMeta: number;      // questões/semana
  flashcardsMeta: number;    // flashcards/semana
  simuladosMeta: number;     // simulados/semana
  horasEstudoMeta: number;   // horas/semana (via Pomodoro)
  casosMeta: number;         // estudos de caso/semana
  redacaoMeta: number;       // redações/semana
}

async function getMetas(userId: string, profileId: string | null): Promise<MetasSemana> {
  const defaults: MetasSemana = { questoesMeta: 150, flashcardsMeta: 50, simuladosMeta: 2, horasEstudoMeta: 10, casosMeta: 3, redacaoMeta: 2 };
  let q = db.from("Note").select("content").eq("userId", userId).eq("subjectId", PREFIX);
  if (profileId) q = q.eq("profileId", profileId);
  const { data } = await q.maybeSingle();
  try { return data?.content ? { ...defaults, ...JSON.parse(data.content) } : defaults; }
  catch { return defaults; }
}

async function saveMetas(userId: string, profileId: string | null, metas: MetasSemana) {
  const content = JSON.stringify(metas);
  let q = db.from("Note").select("id").eq("userId", userId).eq("subjectId", PREFIX);
  if (profileId) q = q.eq("profileId", profileId);
  const { data: ex } = await q.maybeSingle();
  if (ex?.id) await db.from("Note").update({ content }).eq("id", ex.id);
  else await db.from("Note").insert({ id: crypto.randomUUID(), userId, profileId: profileId ?? undefined, subjectId: PREFIX, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=dom
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const metas = await getMetas(dbUser.id, profileId);
  const { start, end } = getWeekBounds();
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // Questões respondidas nessa semana (por perfil ativo)
  let progQ = db.from("Progress").select("id", { count: "exact", head: true })
    .eq("userId", dbUser.id).gte("createdAt", startIso).lte("createdAt", endIso);
  if (profileId) progQ = progQ.eq("profileId", profileId);
  const { count: questoesCount } = await progQ as unknown as { count: number };

  // Flashcards revisados nessa semana (via FlashcardSet.updatedAt — aproximação)
  const { data: setsUpdated } = await db.from("FlashcardSet")
    .select("cards")
    .eq("userId", dbUser.id)
    .gte("updatedAt", startIso).lte("updatedAt", endIso);
  const flashcardsCount = (setsUpdated ?? []).reduce((sum, s) => {
    return sum + (Array.isArray(s.cards) ? s.cards.length : 0);
  }, 0);

  // Simulados feitos nessa semana (por perfil)
  let simQ = db.from("SimuladoHistory").select("id", { count: "exact", head: true })
    .eq("userId", dbUser.id).gte("createdAt", startIso).lte("createdAt", endIso);
  if (profileId) simQ = simQ.eq("profileId", profileId);
  const { count: simCount } = await simQ as unknown as { count: number };

  // Estudos de caso feitos nessa semana (via Note com prefix de caso)
  const { count: casosCount } = await db.from("Note")
    .select("id", { count: "exact", head: true })
    .eq("userId", dbUser.id)
    .like("subjectId", "__CASO__%")
    .gte("createdAt", startIso).lte("createdAt", endIso) as unknown as { count: number };

  // Redações feitas nessa semana (via Note com prefix de redação)
  const { count: redacaoCount } = await db.from("Note")
    .select("id", { count: "exact", head: true })
    .eq("userId", dbUser.id)
    .like("subjectId", "__REDACAO__%")
    .gte("createdAt", startIso).lte("createdAt", endIso) as unknown as { count: number };

  // Horas de estudo via sessões Pomodoro desta semana
  const { data: pomodoroNotes } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", POMODORO_PREFIX)
    .gte("createdAt", startIso)
    .lte("createdAt", endIso);

  const pomodoroMinutes = (pomodoroNotes ?? []).reduce((sum, n) => {
    try {
      const s = JSON.parse(n.content) as { durMin?: number };
      return sum + (typeof s.durMin === "number" ? s.durMin : 0);
    } catch { return sum; }
  }, 0);
  const horasEstudo = +(pomodoroMinutes / 60).toFixed(2);

  return NextResponse.json({
    metas,
    progresso: {
      questoes:    questoesCount ?? 0,
      flashcards:  flashcardsCount,
      simulados:   simCount ?? 0,
      horasEstudo,
      casos:       casosCount ?? 0,
      redacao:     redacaoCount ?? 0,
    },
    semanaInicio: startIso,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const body = await req.json() as Partial<MetasSemana>;
  const current = await getMetas(dbUser.id, profileId);
  const updated = { ...current, ...body };
  await saveMetas(dbUser.id, profileId, updated);
  return NextResponse.json({ metas: updated });
}
