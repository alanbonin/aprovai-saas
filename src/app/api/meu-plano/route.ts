import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

// ── GET /api/meu-plano ────────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [profileRes, subjectsRes, enrolledRes] = await Promise.all([
    db.from("StudentProfile")
      .select("cargo, orgao, banca, dataProva, horasEstudo, nomePreferido")
      .eq("userId", dbUser.id)
      .single(),
    db.from("Subject")
      .select("id, name, categoria")
      .order("name"),
    db.from("StudentSubject")
      .select("subjectId")
      .eq("userId", dbUser.id),
  ]);

  const enrolledIds = new Set((enrolledRes.data ?? []).map(e => e.subjectId));

  return NextResponse.json({
    profile: profileRes.data ?? {},
    subjects: (subjectsRes.data ?? []).map(s => ({
      ...s,
      enrolled: enrolledIds.has(s.id),
    })),
  });
}

// ── PATCH /api/meu-plano ──────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as {
    cargo?: string | null;
    orgao?: string | null;
    banca?: string | null;
    dataProva?: string | null;
    horasEstudo?: number | null;
    enrolledSubjectIds?: string[];  // lista completa dos IDs selecionados
  };

  // Atualiza StudentProfile
  const profileUpdates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if ("cargo"      in body) profileUpdates.cargo      = body.cargo ?? null;
  if ("orgao"      in body) profileUpdates.orgao      = body.orgao ?? null;
  if ("banca"      in body) profileUpdates.banca      = body.banca ?? null;
  if ("dataProva"  in body) profileUpdates.dataProva  = body.dataProva ?? null;
  if ("horasEstudo"in body) profileUpdates.horasEstudo= body.horasEstudo ?? null;

  if (Object.keys(profileUpdates).length > 1) {
    const { error } = await db
      .from("StudentProfile")
      .update(profileUpdates)
      .eq("userId", dbUser.id);
    if (error) return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }

  // Atualiza matérias selecionadas
  if (body.enrolledSubjectIds !== undefined) {
    const newIds = new Set(body.enrolledSubjectIds);

    // Busca atuais
    const { data: current } = await db
      .from("StudentSubject")
      .select("id, subjectId")
      .eq("userId", dbUser.id);

    const currentIds = new Set((current ?? []).map(e => e.subjectId));

    // Para remover: IDs que estavam mas não estão mais
    const toRemove = (current ?? []).filter(e => !newIds.has(e.subjectId)).map(e => e.id);
    // Para adicionar: IDs que não estavam
    const toAdd = [...newIds].filter(id => !currentIds.has(id));

    if (toRemove.length > 0) {
      await db.from("StudentSubject").delete().in("id", toRemove);
    }
    if (toAdd.length > 0) {
      await db.from("StudentSubject").insert(
        toAdd.map(subjectId => ({
          userId: dbUser.id,
          subjectId,
          fromEdital: false,
          createdAt: new Date().toISOString(),
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
