import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { log } from "@/lib/logger";

/**
 * POST /api/onboarding
 * Salva o perfil do aluno após o wizard de onboarding e marca onboardingDone = true.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json() as {
    nomePreferido?: string;
    cargo?: string | null;
    orgao?: string | null;
    banca?: string | null;
    dataProva?: string | null;
    horasEstudo?: number | null;   // em horas/dia
    categoria?: string | null;
    modalidade?: string | null;
  };

  // Verifica se já tem um perfil padrão
  const { data: existingProfiles } = await db
    .from("StudentProfile")
    .select("id")
    .eq("userId", dbUser.id)
    .limit(1);

  const profileData = {
    userId: dbUser.id,
    nomePreferido: body.nomePreferido?.trim() || null,
    cargo: body.cargo || null,
    orgao: body.orgao || null,
    banca: body.banca || null,
    dataProva: body.dataProva || null,
    horasEstudo: body.horasEstudo ?? null,
    isDefault: true,
    onboardingDone: true,
    modalidade: body.modalidade ?? "CONCURSO_PUBLICO",
    updatedAt: new Date().toISOString(),
  };

  if (existingProfiles && existingProfiles.length > 0) {
    // Atualiza o perfil existente
    const { error } = await db
      .from("StudentProfile")
      .update(profileData)
      .eq("userId", dbUser.id);

    if (error) {
      log.error("db.onboarding_update_profile", { table: "StudentProfile" }, error);
      return NextResponse.json({ error: "Erro ao salvar perfil" }, { status: 500 });
    }
  } else {
    // Cria novo perfil
    const { error } = await db
      .from("StudentProfile")
      .insert({ ...profileData, createdAt: new Date().toISOString() });

    if (error) {
      log.error("db.onboarding_insert_profile", { table: "StudentProfile" }, error);
      return NextResponse.json({ error: "Erro ao criar perfil" }, { status: 500 });
    }
  }

  // Atualiza nome preferido no User se fornecido
  if (body.nomePreferido?.trim()) {
    await db
      .from("User")
      .update({ name: body.nomePreferido.trim() })
      .eq("id", dbUser.id);
  }

  // Salva metas semanais proporcionais às horas de estudo informadas
  // Distribuição: questões 35% | leitura PDF 15% | flashcards 15% | teoria 20% | revisão 15%
  if (body.horasEstudo && body.horasEstudo > 0) {
    const totalMin    = body.horasEstudo * 60;
    const questoesDia = Math.round((totalMin * 0.35) / 2);   // ~2 min/questão
    const questoesMeta    = questoesDia * 5;                  // semana (5 dias úteis)
    const flashcardsDia   = Math.round((totalMin * 0.15) / 0.75);
    const flashcardsMeta  = flashcardsDia * 5;
    const horasEstudoMeta = body.horasEstudo * 5;
    const leituraPdfMin   = Math.round(totalMin * 0.15);      // min/dia para PDFs
    const leituraPdfMeta  = leituraPdfMin * 5;                // min/semana

    const metasContent = JSON.stringify({
      questoesMeta:   Math.max(questoesMeta, 10),   // mínimo 10/semana
      flashcardsMeta: Math.max(flashcardsMeta, 10),
      simuladosMeta:  body.horasEstudo >= 2 ? 1 : 1,
      horasEstudoMeta,
      leituraPdfMeta: Math.max(leituraPdfMeta, 15), // mínimo 15 min/semana
    });

    const PREFIX_METAS = "__METAS_SEMANAIS__";
    const { data: existingMeta } = await db
      .from("Note").select("id").eq("userId", dbUser.id).eq("subjectId", PREFIX_METAS).single();
    if (existingMeta?.id) {
      await db.from("Note").update({ content: metasContent }).eq("id", existingMeta.id);
    } else {
      await db.from("Note").insert({ userId: dbUser.id, subjectId: PREFIX_METAS, content: metasContent });
    }
    log.info("onboarding.metas_saved", { userId: dbUser.id, questoesDia, questoesMeta });
  }

  // Inscreve automaticamente nas matérias da categoria escolhida
  if (body.categoria) {
    const { data: subjects } = await db
      .from("Subject")
      .select("id")
      .eq("categoria", body.categoria)
      .limit(50);

    if (subjects && subjects.length > 0) {
      // Busca inscrições existentes para não duplicar
      const { data: existing } = await db
        .from("StudentSubject")
        .select("subjectId")
        .eq("userId", dbUser.id);

      const existingIds = new Set((existing ?? []).map(e => e.subjectId));

      const toInsert = subjects
        .filter(s => !existingIds.has(s.id))
        .map(s => ({
          userId: dbUser.id,
          subjectId: s.id,
          fromEdital: false,
          createdAt: new Date().toISOString(),
        }));

      if (toInsert.length > 0) {
        await db.from("StudentSubject").insert(toInsert);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
