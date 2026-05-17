import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const NOTE_PREFIX = "__PLANO_ESTUDOS__";

interface PlanoBlocoManual {
  dia: string;       // "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom"
  hora: string;      // "08:00"
  durMin: number;    // 60
  subjectId: string | null;
  atividade: string; // "Questões", "Flashcards", "Revisão", "Leitura", "Simulado"
  concluido?: boolean;
}

export interface PlanoSemana {
  blocos: PlanoBlocoManual[];
  geradoEm: string;
}

async function getPlano(userId: string): Promise<PlanoSemana | null> {
  const { data } = await db.from("Note").select("content")
    .eq("userId", userId).eq("subjectId", NOTE_PREFIX).single();
  try {
    return data?.content ? JSON.parse(data.content) as PlanoSemana : null;
  } catch { return null; }
}

async function savePlano(userId: string, plano: PlanoSemana) {
  const content = JSON.stringify(plano);
  const { data: ex } = await db.from("Note").select("id")
    .eq("userId", userId).eq("subjectId", NOTE_PREFIX).single();
  if (ex?.id) {
    await db.from("Note").update({ content }).eq("id", ex.id);
  } else {
    await db.from("Note").insert({ userId, subjectId: NOTE_PREFIX, content });
  }
}

/**
 * GET /api/plano-estudos
 * Retorna o plano salvo ou gera um plano padrão baseado no perfil do aluno.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Busca plano salvo
  const saved = await getPlano(dbUser.id);
  if (saved) return NextResponse.json(saved);

  // Busca matérias do aluno para gerar plano padrão
  const { data: studentSubjects } = await db
    .from("StudentSubject")
    .select("subjectId, Subject(id, name)")
    .eq("userId", dbUser.id);

  const subjects = (studentSubjects ?? [])
    .map((ss: { subjectId: string; Subject: unknown }) => {
      const s = ss.Subject as { id: string; name: string }[] | { id: string; name: string } | null;
      return Array.isArray(s) ? s[0] : s;
    })
    .filter(Boolean) as { id: string; name: string }[];

  // Gera plano padrão: distribui matérias em dias úteis (seg-sex)
  const dias = ["seg", "ter", "qua", "qui", "sex"] as const;
  const atividades = ["Questões", "Flashcards", "Leitura", "Revisão"] as const;
  const blocos: PlanoBlocoManual[] = [];

  if (subjects.length === 0) {
    // Plano genérico sem matérias
    dias.forEach((dia, i) => {
      blocos.push({ dia, hora: "08:00", durMin: 60, subjectId: null, atividade: atividades[i % 4], concluido: false });
      blocos.push({ dia, hora: "19:00", durMin: 30, subjectId: null, atividade: "Flashcards", concluido: false });
    });
    blocos.push({ dia: "sab", hora: "09:00", durMin: 90, subjectId: null, atividade: "Simulado", concluido: false });
  } else {
    // Distribui matérias ciclicamente pelos dias
    dias.forEach((dia, dayIdx) => {
      const subject = subjects[dayIdx % subjects.length];
      const atividade = atividades[dayIdx % 3]; // Questões, Flashcards, Leitura alternados
      blocos.push({ dia, hora: "08:00", durMin: 60, subjectId: subject.id, atividade, concluido: false });

      // Segunda matéria por dia (se houver mais de 1)
      if (subjects.length > 1) {
        const subject2 = subjects[(dayIdx + 1) % subjects.length];
        blocos.push({ dia, hora: "19:00", durMin: 45, subjectId: subject2.id, atividade: "Flashcards", concluido: false });
      }
    });

    // Sábado: simulado ou revisão
    blocos.push({ dia: "sab", hora: "09:00", durMin: 90, subjectId: null, atividade: "Simulado", concluido: false });
    blocos.push({ dia: "dom", hora: "10:00", durMin: 60, subjectId: null, atividade: "Revisão", concluido: false });
  }

  const plano: PlanoSemana = { blocos, geradoEm: new Date().toISOString() };
  await savePlano(dbUser.id, plano);
  return NextResponse.json(plano);
}

/**
 * PATCH /api/plano-estudos
 * Salva o plano completo (editado pelo aluno) ou marca um bloco como concluído.
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as
    | { blocos: PlanoBlocoManual[] }
    | { toggleBloco: { dia: string; hora: string } };

  if ("blocos" in body) {
    const plano: PlanoSemana = { blocos: body.blocos, geradoEm: new Date().toISOString() };
    await savePlano(dbUser.id, plano);
    return NextResponse.json(plano);
  }

  if ("toggleBloco" in body) {
    const current = await getPlano(dbUser.id);
    if (!current) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    const { dia, hora } = body.toggleBloco;
    const updated: PlanoSemana = {
      ...current,
      blocos: current.blocos.map(b =>
        b.dia === dia && b.hora === hora ? { ...b, concluido: !b.concluido } : b
      ),
    };
    await savePlano(dbUser.id, updated);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Body inválido" }, { status: 400 });
}

/**
 * DELETE /api/plano-estudos
 * Apaga o plano salvo (permite regenerar).
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await db.from("Note").delete().eq("userId", dbUser.id).eq("subjectId", NOTE_PREFIX);
  return NextResponse.json({ ok: true });
}
