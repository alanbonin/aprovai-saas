import { db } from "@/lib/db";

const CONFIG_PREFIX = "__CONFIG__:";

// Valores padrão de todas as configurações
export const CONFIG_DEFAULTS = {
  // XP
  "xp.questao_correta": 2,
  "xp.flashcard_lembrei": 1,
  "xp.simulado_por_acerto": 3,
  "xp.streak_bonus": 20,
  "xp.streak_bonus_intervalo": 7, // a cada N dias de streak

  // Trial
  "trial.duracao_dias": 7,
  "trial.aviso_dias_antes": 3, // avisar X dias antes de expirar

  // Mentor proativo — dias após onboarding para disparar
  "mentor.dias_proativo": [1, 7, 30],
  "mentor.dias_antes_prova": 30, // dispara quando prova está a X dias

  // Reativação
  "reativacao.inativo_apos_dias": 7, // inativo há X dias
  "reativacao.max_inativo_dias": 30, // não envia para mais de X dias

  // Streak
  "streak.milestones": [3, 7, 14, 30, 60, 100],

  // Questões
  "questoes.marcos": [10, 50, 100, 250, 500, 1000],

  // Limites gerais
  "limites.max_historico_chat": 50,
  "limites.max_favoritos": 1000,
  "limites.max_notas": 500,
  "limites.max_message_len": 4000,

  // Horários dos crons (informativo)
  "cron.lembrete": "10h UTC (7h BRT) — diário",
  "cron.relatorio_semanal": "0h UTC segunda (21h BRT dom)",
  "cron.reativacao": "14h UTC quarta (11h BRT)",
  "cron.questao_do_dia": "8h UTC (5h BRT) — diário",
  "cron.trial_expirando": "11h UTC (8h BRT) — diário",
  "cron.streak": "0h UTC (21h BRT) — diário",
  "cron.expirar_assinaturas": "6h UTC (3h BRT) — diário",

  // IA
  "ia.modelo_mentor": "claude-sonnet-4-6",
  "ia.modelo_rapido": "claude-haiku-4-5-20251001",
  "ia.max_tokens_mentor": 1024,
  "ia.max_tokens_rapido": 600,

  // Geral
  "geral.nome_plataforma": "AprovAI360",
  "geral.email_suporte": "suporte@aprovai360.com.br",
  "geral.email_admin": "alanbonin@gmail.com",
  "geral.whatsapp_suporte": "",
  "geral.modo_manutencao": false,
  "geral.banner_global": "",
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;
export type ConfigValue = (typeof CONFIG_DEFAULTS)[ConfigKey];

/** Busca uma configuração do banco (com fallback para o default) */
export async function getConfig<K extends ConfigKey>(key: K): Promise<typeof CONFIG_DEFAULTS[K]> {
  try {
    const { data } = await db
      .from("Note")
      .select("content")
      .eq("title", `${CONFIG_PREFIX}${key}`)
      .is("userId", null)
      .maybeSingle();

    if (data?.content) {
      return JSON.parse(data.content) as typeof CONFIG_DEFAULTS[K];
    }
  } catch { /* usa default */ }
  return CONFIG_DEFAULTS[key];
}

/** Busca múltiplas configs de uma vez */
export async function getConfigs<K extends ConfigKey>(keys: K[]): Promise<Record<K, typeof CONFIG_DEFAULTS[K]>> {
  const prefixedKeys = keys.map(k => `${CONFIG_PREFIX}${k}`);
  const { data } = await db
    .from("Note")
    .select("title, content")
    .in("title", prefixedKeys)
    .is("userId", null);

  const result = {} as Record<K, typeof CONFIG_DEFAULTS[K]>;
  for (const key of keys) {
    const row = data?.find(r => r.title === `${CONFIG_PREFIX}${key}`);
    result[key] = row?.content ? JSON.parse(row.content) : CONFIG_DEFAULTS[key];
  }
  return result;
}

/** Busca TODAS as configs (para o painel admin) */
export async function getAllConfigs(): Promise<Record<string, ConfigValue>> {
  const { data } = await db
    .from("Note")
    .select("title, content")
    .like("title", `${CONFIG_PREFIX}%`)
    .is("userId", null);

  const result: Record<string, ConfigValue> = { ...(CONFIG_DEFAULTS as Record<string, ConfigValue>) };
  for (const row of data ?? []) {
    const key = row.title.replace(CONFIG_PREFIX, "");
    if (key in CONFIG_DEFAULTS && row.content) {
      try { result[key] = JSON.parse(row.content); } catch { /* ignora */ }
    }
  }
  return result;
}

/** Salva uma configuração no banco */
export async function setConfig(key: string, value: ConfigValue): Promise<void> {
  const title = `${CONFIG_PREFIX}${key}`;
  const content = JSON.stringify(value);

  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("title", title)
    .is("userId", null)
    .maybeSingle();

  if (existing) {
    await db.from("Note").update({ content }).eq("id", (existing as { id: string }).id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      title,
      content,
      userId: null,
      subjectId: null,
      createdAt: new Date().toISOString(),
    });
  }
}

/** Remove uma config do banco (restaura para o default) */
export async function deleteConfig(key: string): Promise<void> {
  await db
    .from("Note")
    .delete()
    .eq("title", `${CONFIG_PREFIX}${key}`)
    .is("userId", null);
}
