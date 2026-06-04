import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { log } from "@/lib/logger";
import { resolveCargoId } from "@/lib/cargos";
import { getMateriasParaCargo } from "@/lib/materias-por-cargo";

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
    dataProva?: string | null;
    horasEstudo?: number | null;
    categoria?: string | null;
    modalidade?: string | null;
    novoPerfil?: boolean; // true = sempre criar perfil novo
  };

  // Busca perfis existentes
  const { data: existingProfiles } = await db
    .from("StudentProfile")
    .select("id")
    .eq("userId", dbUser.id);

  const isNovoPerfil = !!body.novoPerfil;

  // Verifica limite de perfis quando criar novo
  if (isNovoPerfil) {
    const { maxProfilesForSubscription } = await import("@/lib/get-active-profile");
    const maxProfiles = maxProfilesForSubscription(
      (dbUser as { subscription?: Parameters<typeof maxProfilesForSubscription>[0] }).subscription ?? null
    );
    if ((existingProfiles?.length ?? 0) >= maxProfiles) {
      return NextResponse.json({ error: `Limite de ${maxProfiles} perfil(is) atingido para o seu plano.` }, { status: 403 });
    }
  }

  const profileData = {
    userId: dbUser.id,
    nomePreferido: body.nomePreferido?.trim() || null,
    cargo: body.cargo || null,
    orgao: body.orgao || null,
    dataProva: body.dataProva || null,
    horasEstudo: body.horasEstudo ?? null,
    isDefault: !isNovoPerfil, // novo perfil não substitui o padrão
    onboardingDone: true,
    modalidade: body.modalidade ?? "CONCURSO_PUBLICO",
    updatedAt: new Date().toISOString(),
  };

  if (!isNovoPerfil && existingProfiles && existingProfiles.length > 0) {
    // Atualiza o perfil padrão existente
    const { error } = await db
      .from("StudentProfile")
      .update(profileData)
      .eq("userId", dbUser.id)
      .eq("isDefault", true);

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
      questoesMeta:   Math.max(questoesMeta, 150),  // mínimo 150/semana (30/dia)
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
      await db.from("Note").insert({ id: crypto.randomUUID(), userId: dbUser.id, subjectId: PREFIX_METAS, content: metasContent, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    log.info("onboarding.metas_saved", { userId: dbUser.id, questoesDia, questoesMeta });
  }

  // Inscreve nas matérias corretas do edital via mapeamento de cargos
  {
    const now = new Date().toISOString();
    let subjectIds: string[] = [];
    let fromEdital = false;

    // 1. Tenta resolver pelo cargo+orgao (fonte primária — mapeamento de editais)
    if (body.cargo || body.orgao) {
      const resolved = resolveCargoId(body.cargo ?? "", body.orgao ?? "");
      if (resolved) {
        const nomesEdital = getMateriasParaCargo(resolved.cargoId, resolved.estado);
        if (nomesEdital.length > 0) {
          const { data: byName } = await db
            .from("Subject")
            .select("id")
            .in("name", nomesEdital);
          subjectIds = (byName ?? []).map((s: { id: string }) => s.id);
          fromEdital = true;
          log.info("onboarding.cargo_resolved", {
            cargoId: resolved.cargoId,
            estado: resolved.estado ?? null,
            found: subjectIds.length,
          });
        }
      }
    }

    // 2. Fallback: categoria enviada pelo wizard (ENEM, OAB, etc.)
    if (subjectIds.length === 0 && body.categoria) {
      const { data: byCat } = await db
        .from("Subject")
        .select("id")
        .eq("categoria", body.categoria)
        .limit(50);
      subjectIds = (byCat ?? []).map((s: { id: string }) => s.id);
    }

    // 3. Insere evitando duplicatas
    if (subjectIds.length > 0) {
      const { data: existing } = await db
        .from("StudentSubject")
        .select("subjectId")
        .eq("userId", dbUser.id);
      const existingIds = new Set((existing ?? []).map((e: { subjectId: string }) => e.subjectId));

      const toInsert = subjectIds
        .filter(id => !existingIds.has(id))
        .map(subjectId => ({
          id: crypto.randomUUID(),
          userId: dbUser.id,
          subjectId,
          fromEdital,
          createdAt: now,
        }));

      if (toInsert.length > 0) {
        await db.from("StudentSubject").insert(toInsert);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
