import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

// ── GET /api/meu-plano ────────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  let enrolledQuery = db.from("StudentSubject").select("subjectId").eq("userId", dbUser.id);
  if (profileId) {
    enrolledQuery = enrolledQuery.eq("profileId", profileId);
  } else {
    enrolledQuery = enrolledQuery.is("profileId", null);
  }

  const [profileRes, subjectsRes, enrolledRes] = await Promise.all([
    db.from("StudentProfile")
      .select("cargo, orgao, banca, dataProva, horasEstudo, nomePreferido")
      .eq("userId", dbUser.id)
      .eq("id", profileId ?? "")
      .maybeSingle(),
    db.from("Subject")
      .select("id, name, categoria")
      .order("name"),
    enrolledQuery,
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
    // Busca perfil ativo para garantir que só atualiza o perfil correto (não todos)
    const activeProfileForUpdate = await getActiveProfile(dbUser.id);
    if (!activeProfileForUpdate) {
      return NextResponse.json({ error: "Nenhum perfil ativo encontrado" }, { status: 400 });
    }
    const { error } = await db
      .from("StudentProfile")
      .update(profileUpdates)
      .eq("id", activeProfileForUpdate.id)   // filtra pelo ID do perfil ativo
      .eq("userId", dbUser.id);              // dupla verificação de ownership
    if (error) return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }

  // Atualiza matérias selecionadas (sempre isoladas por perfil ativo)
  if (body.enrolledSubjectIds !== undefined) {
    const activeProfile2 = await getActiveProfile(dbUser.id);
    const profileId2 = activeProfile2?.id ?? null;
    const newIds = new Set(body.enrolledSubjectIds);

    // Busca atuais deste perfil
    let currentQuery = db.from("StudentSubject").select("id, subjectId").eq("userId", dbUser.id);
    if (profileId2) {
      currentQuery = currentQuery.eq("profileId", profileId2);
    } else {
      currentQuery = currentQuery.is("profileId", null);
    }
    const { data: current } = await currentQuery;

    const currentIds = new Set((current ?? []).map(e => e.subjectId));

    const toRemove = (current ?? []).filter(e => !newIds.has(e.subjectId)).map(e => e.id);
    const toAdd = [...newIds].filter(id => !currentIds.has(id));

    if (toRemove.length > 0) {
      await db.from("StudentSubject").delete().in("id", toRemove);
    }
    if (toAdd.length > 0) {
      await db.from("StudentSubject").insert(
        toAdd.map(subjectId => ({
          userId: dbUser.id,
          profileId: profileId2,
          subjectId,
          fromEdital: false,
          createdAt: new Date().toISOString(),
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
