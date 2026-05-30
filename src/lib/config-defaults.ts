/**
 * Valores padrão das configurações do sistema.
 * Arquivo separado para poder ser importado por client components.
 * NÃO importa db ou qualquer módulo server-only.
 */
export const CONFIG_DEFAULTS = {
  // XP
  "xp.questao_correta": 2,
  "xp.flashcard_lembrei": 1,
  "xp.simulado_por_acerto": 3,
  "xp.streak_bonus": 20,
  "xp.streak_bonus_intervalo": 7,

  // Trial
  "trial.duracao_dias": 7,
  "trial.aviso_dias_antes": 3,

  // Mentor proativo
  "mentor.dias_proativo": [1, 7, 30],
  "mentor.dias_antes_prova": 30,

  // Reativação
  "reativacao.inativo_apos_dias": 7,
  "reativacao.max_inativo_dias": 30,

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
