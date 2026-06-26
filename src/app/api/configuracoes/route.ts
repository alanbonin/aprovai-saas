import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { configuracoesLimiter } from "@/lib/rate-limit";

const PREFS_PREFIX = "__USER_PREFS__";

interface Prefs {
  emailQuestaoDodia: boolean;
  emailRelatorioSemanal: boolean;
  emailLembrete: boolean;
  emailReativacao: boolean;
}

// Normaliza celular: aceita (11) 99999-9999, 11999999999, +5511999999999 → +5511999999999
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;
  // se já tem código do país (55 + 10/11 dígitos)
  if (digits.length === 12 || digits.length === 13) return `+${digits}`;
  // DDD + número (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return null; // formato inválido — ignora
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

  const prefs = await getPrefs(dbUser.id);

  const { data: sub } = await db
    .from("Subscription")
    .select("startDate, endDate, status")
    .eq("userId", dbUser.id)
    .maybeSingle();

  return NextResponse.json({
    name: dbUser.name ?? "",
    email: dbUser.email ?? "",
    phone: (dbUser as unknown as { phone?: string | null }).phone ?? "",
    avatarUrl: (dbUser as unknown as { avatarUrl?: string | null }).avatarUrl ?? null,
    prefs,
    subscription: sub ?? null,
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

  const rl = await configuracoesLimiter.check(user.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const body = await req.json() as {
    name?: string;
    phone?: string;
    prefs?: Partial<Prefs>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: PromiseLike<any>[] = [];

  // Atualiza nome e/ou celular do usuário
  const userFields: Record<string, unknown> = {};
  if (body.name !== undefined) userFields.name = body.name.trim() || dbUser.name;
  if (body.phone !== undefined) {
    const normalized = normalizePhone(body.phone);
    userFields.phone = normalized; // null se vazio/inválido
  }
  if (Object.keys(userFields).length > 0) {
    updates.push(db.from("User").update(userFields).eq("id", dbUser.id));
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
      updates.push(db.from("Note").insert({ id: crypto.randomUUID(), userId: dbUser.id, subjectId: PREFS_PREFIX, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    }
  }

  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}
