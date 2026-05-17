import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFS_PREFIX = "__USER_PREFS__";

interface Prefs {
  emailQuestaoDodia: boolean;
  emailRelatorioSemanal: boolean;
  emailLembrete: boolean;
  emailReativacao: boolean;
}

const DEFAULT_PREFS: Prefs = {
  emailQuestaoDodia: true,
  emailRelatorioSemanal: true,
  emailLembrete: true,
  emailReativacao: true,
};

async function getPrefs(userId: string): Promise<Prefs> {
  const { data } = await db.from("Note").select("content")
    .eq("userId", userId).eq("subjectId", PREFS_PREFIX).single();
  try {
    return data?.content ? { ...DEFAULT_PREFS, ...JSON.parse(data.content) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

/**
 * GET /api/configuracoes
 * Retorna as preferências do aluno (perfil + prefs de notificação).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [profile, prefs] = await Promise.all([
    db.from("StudentProfile").select("cargo, orgao, dataProva, dificuldades").eq("userId", dbUser.id).single(),
    getPrefs(dbUser.id),
  ]);

  return NextResponse.json({
    name: dbUser.name ?? "",
    email: dbUser.email ?? "",
    cargo: profile.data?.cargo ?? "",
    orgao: profile.data?.orgao ?? "",
    dataProva: profile.data?.dataProva ?? null,
    dificuldades: profile.data?.dificuldades ?? "",
    prefs,
  });
}

/**
 * PATCH /api/configuracoes
 * Atualiza preferências (profile e/ou notification prefs).
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    cargo?: string;
    orgao?: string;
    dataProva?: string | null;
    dificuldades?: string;
    prefs?: Partial<Prefs>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: PromiseLike<any>[] = [];

  // Atualiza nome do usuário
  if (body.name !== undefined) {
    updates.push(
      db.from("User").update({ name: body.name.trim() || dbUser.name }).eq("id", dbUser.id)
    );
  }

  // Atualiza StudentProfile
  const profileFields: Record<string, unknown> = {};
  if (body.cargo !== undefined)       profileFields.cargo = body.cargo || null;
  if (body.orgao !== undefined)       profileFields.orgao = body.orgao || null;
  if (body.dataProva !== undefined)   profileFields.dataProva = body.dataProva || null;
  if (body.dificuldades !== undefined) profileFields.dificuldades = body.dificuldades || null;

  if (Object.keys(profileFields).length > 0) {
    // Upsert StudentProfile
    const { data: existing } = await db.from("StudentProfile").select("id").eq("userId", dbUser.id).single();
    if (existing?.id) {
      updates.push(db.from("StudentProfile").update(profileFields).eq("id", existing.id));
    } else {
      updates.push(db.from("StudentProfile").insert({ userId: dbUser.id, ...profileFields }));
    }
  }

  // Atualiza prefs de notificação
  if (body.prefs) {
    const current = await getPrefs(dbUser.id);
    const merged: Prefs = { ...current, ...body.prefs };
    const content = JSON.stringify(merged);
    const { data: existingNote } = await db.from("Note").select("id")
      .eq("userId", dbUser.id).eq("subjectId", PREFS_PREFIX).single();
    if (existingNote?.id) {
      updates.push(db.from("Note").update({ content }).eq("id", existingNote.id));
    } else {
      updates.push(db.from("Note").insert({ userId: dbUser.id, subjectId: PREFS_PREFIX, content }));
    }
  }

  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}
