import { db } from "@/lib/db";

const PREFS_PREFIX = "__USER_PREFS__";

export interface EmailPrefs {
  emailQuestaoDodia: boolean;
  emailRelatorioSemanal: boolean;
  emailLembrete: boolean;
  emailReativacao: boolean;
}

const DEFAULT_PREFS: EmailPrefs = {
  emailQuestaoDodia: true,
  emailRelatorioSemanal: true,
  emailLembrete: true,
  emailReativacao: true,
};

/**
 * Busca as prefs de notificação por email de um usuário.
 * Por padrão todos os emails estão habilitados (opt-out).
 */
export async function getEmailPrefs(userId: string): Promise<EmailPrefs> {
  const { data } = await db
    .from("Note")
    .select("content")
    .eq("userId", userId)
    .eq("subjectId", PREFS_PREFIX)
    .single();
  try {
    return data?.content
      ? { ...DEFAULT_PREFS, ...JSON.parse(data.content) as Partial<EmailPrefs> }
      : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Filtra uma lista de userIds removendo os que optaram por não receber
 * um tipo específico de email.
 */
export async function filterByEmailPref(
  userIds: string[],
  prefKey: keyof EmailPrefs
): Promise<string[]> {
  if (userIds.length === 0) return [];

  // Busca notes de prefs para esses usuários
  const { data: notes } = await db
    .from("Note")
    .select("userId, content")
    .in("userId", userIds)
    .eq("subjectId", PREFS_PREFIX);

  // Monta mapa de userId -> pref value
  const optedOut = new Set<string>();
  for (const note of notes ?? []) {
    try {
      const prefs = JSON.parse(note.content) as Partial<EmailPrefs>;
      if (prefs[prefKey] === false) optedOut.add(note.userId);
    } catch { /* ignore */ }
  }

  return userIds.filter(id => !optedOut.has(id));
}
