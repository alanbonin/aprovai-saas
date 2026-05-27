import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getAllProfiles, getActiveProfile, maxProfilesForSubscription } from "@/lib/get-active-profile";
import { log } from "@/lib/logger";

// ── GET — lista perfis do usuário ────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [profiles, active] = await Promise.all([
    getAllProfiles(dbUser.id),
    getActiveProfile(dbUser.id),
  ]);

  const maxProfiles = maxProfilesForSubscription(
    (dbUser as unknown as { subscription: Parameters<typeof maxProfilesForSubscription>[0] }).subscription
  );

  return NextResponse.json({
    profiles,
    activeProfileId: active?.id ?? null,
    maxProfiles,
    canCreate: profiles.length < maxProfiles,
  });
}

// ── POST — cria novo perfil ──────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const maxProfiles = maxProfilesForSubscription(
    (dbUser as unknown as { subscription: Parameters<typeof maxProfilesForSubscription>[0] }).subscription
  );

  const existing = await getAllProfiles(dbUser.id);
  if (existing.length >= maxProfiles) {
    return NextResponse.json(
      { error: `Seu plano permite no máximo ${maxProfiles} perfil(is). Faça upgrade para adicionar mais.` },
      { status: 403 }
    );
  }

  const body = await req.json() as {
    label?: string;
    cargo?: string;
    orgao?: string;
    banca?: string;
    dataProva?: string;
    horasEstudo?: number;
    nivelAtual?: string;
    disponibilidade?: string;
    modalidade?: string;
  };

  if (!body.cargo && !body.label) {
    return NextResponse.json({ error: "Informe pelo menos o cargo ou um nome para o perfil." }, { status: 400 });
  }

  const label = body.label?.trim() ||
    [body.cargo, body.orgao].filter(Boolean).join(" — ") ||
    "Novo Perfil";

  const { data: profile, error } = await db.from("StudentProfile").insert({
    userId: dbUser.id,
    label,
    isDefault: false,
    cargo: body.cargo ?? null,
    orgao: body.orgao ?? null,
    banca: body.banca ?? null,
    dataProva: body.dataProva ?? null,
    horasEstudo: body.horasEstudo ?? null,
    nivelAtual: body.nivelAtual ?? null,
    disponibilidade: body.disponibilidade ?? null,
    modalidade: body.modalidade ?? "CONCURSO_PUBLICO",
    onboardingDone: true, // perfis extras não precisam refazer onboarding completo
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select().single();

  if (error) {
    log.error("db.profiles_create_error", { table: "StudentProfile" }, error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ profile }, { status: 201 });
}
