import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

const NOTE_PREFIX = "__PLANO_ESTUDOS__";

interface PlanoBlocoManual {
  dia: string;
  hora: string;
  durMin: number;
  subjectId: string | null;
  atividade: string;
  concluido?: boolean;
}

export interface PlanoSemana {
  blocos: PlanoBlocoManual[];
  geradoEm: string;
}

async function getPlano(userId: string, profileId: string | null): Promise<PlanoSemana | null> {
  let q = db.from("Note").select("content").eq("userId", userId).eq("subjectId", NOTE_PREFIX);
  if (profileId) q = q.eq("profileId", profileId);
  else q = q.is("profileId", null);
  const { data } = await q.maybeSingle();
  try {
    return data?.content ? JSON.parse(data.content) as PlanoSemana : null;
  } catch { return null; }
}

async function savePlano(userId: string, profileId: string | null, plano: PlanoSemana) {
  const content = JSON.stringify(plano);
  let q = db.from("Note").select("id").eq("userId", userId).eq("subjectId", NOTE_PREFIX);
  if (profileId) q = q.eq("profileId", profileId);
  else q = q.is("profileId", null);
  const { data: ex } = await q.maybeSingle();
  if (ex?.id) {
    await db.from("Note").update({ content }).eq("id", ex.id);
  } else {
    await db.from("Note").insert({ id: crypto.randomUUID(), userId, profileId, subjectId: NOTE_PREFIX, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const saved = await getPlano(dbUser.id, profileId);
  if (saved) return NextResponse.json(saved);

  // Gera plano padrão com matérias do perfil ativo
  let ssQ = db.from("StudentSubject").select("subjectId, Subject(id, name)").eq("userId", dbUser.id);
  if (profileId) ssQ = ssQ.eq("profileId", profileId);
  else ssQ = ssQ.is("profileId", null);
  const { data: studentSubjects } = await ssQ;

  const subjects = (studentSubjects ?? [])
    .map((ss: { subjectId: string; Subject: unknown }) => {
      const s = ss.Subject as { id: string; name: string }[] | { id: string; name: string } | null;
      return Array.isArray(s) ? s[0] : s;
    })
    .filter(Boolean) as { id: string; name: string }[];

  const dias = ["seg", "ter", "qua", "qui", "sex"] as const;
  const atividades = ["Questões", "Flashcards", "Leitura", "Revisão"] as const;
  const blocos: PlanoBlocoManual[] = [];

  if (subjects.length === 0) {
    dias.forEach((dia, i) => {
      blocos.push({ dia, hora: "08:00", durMin: 60, subjectId: null, atividade: atividades[i % 4], concluido: false });
      blocos.push({ dia, hora: "19:00", durMin: 30, subjectId: null, atividade: "Flashcards", concluido: false });
    });
    blocos.push({ dia: "sab", hora: "09:00", durMin: 90, subjectId: null, atividade: "Simulado", concluido: false });
  } else {
    dias.forEach((dia, dayIdx) => {
      const subject = subjects[dayIdx % subjects.length];
      const atividade = atividades[dayIdx % 3];
      blocos.push({ dia, hora: "08:00", durMin: 60, subjectId: subject.id, atividade, concluido: false });
      if (subjects.length > 1) {
        const subject2 = subjects[(dayIdx + 1) % subjects.length];
        blocos.push({ dia, hora: "19:00", durMin: 45, subjectId: subject2.id, atividade: "Flashcards", concluido: false });
      }
    });
    blocos.push({ dia: "sab", hora: "09:00", durMin: 90, subjectId: null, atividade: "Simulado", concluido: false });
    blocos.push({ dia: "dom", hora: "10:00", durMin: 60, subjectId: null, atividade: "Revisão", concluido: false });
  }

  const plano: PlanoSemana = { blocos, geradoEm: new Date().toISOString() };
  await savePlano(dbUser.id, profileId, plano);
  return NextResponse.json(plano);
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const body = await req.json() as
    | { blocos: PlanoBlocoManual[] }
    | { toggleBloco: { dia: string; hora: string } };

  if ("blocos" in body) {
    const plano: PlanoSemana = { blocos: body.blocos, geradoEm: new Date().toISOString() };
    await savePlano(dbUser.id, profileId, plano);
    return NextResponse.json(plano);
  }

  if ("toggleBloco" in body) {
    const current = await getPlano(dbUser.id, profileId);
    if (!current) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    const { dia, hora } = body.toggleBloco;
    const updated: PlanoSemana = {
      ...current,
      blocos: current.blocos.map(b =>
        b.dia === dia && b.hora === hora ? { ...b, concluido: !b.concluido } : b
      ),
    };
    await savePlano(dbUser.id, profileId, updated);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Body inválido" }, { status: 400 });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  let q = db.from("Note").delete().eq("userId", dbUser.id).eq("subjectId", NOTE_PREFIX);
  if (profileId) q = q.eq("profileId", profileId);
  else q = q.is("profileId", null);
  await q;

  return NextResponse.json({ ok: true });
}
