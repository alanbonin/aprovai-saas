/**
 * Rate limiter distribuído via Upstash Redis.
 *
 * Funciona corretamente em serverless (Vercel) — estado compartilhado entre
 * todas as instâncias. Fallback para in-memory se UPSTASH não configurado
 * (apenas para desenvolvimento local).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash Redis client ─────────────────────────────────────────────────────
function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

// ── Fábrica de limiters ──────────────────────────────────────────────────────
interface LimiterConfig {
  max: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  prefix: string;
}

interface CheckResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  error?: string;
}

export function createLimiter(cfg: LimiterConfig) {
  // ── Redis distribuído (produção) ────────────────────────────────────────────
  if (redis) {
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.max, cfg.window),
      prefix: `aprovai:rl:${cfg.prefix}`,
    });

    return {
      async check(key: string): Promise<CheckResult> {
        const result = await rl.limit(key);
        if (result.success) {
          return { ok: true, remaining: result.remaining, resetAt: result.reset };
        }
        const secsLeft = Math.ceil((result.reset - Date.now()) / 1000);
        return {
          ok: false,
          remaining: 0,
          resetAt: result.reset,
          error: `Muitas requisições. Tente novamente em ${secsLeft}s.`,
        };
      },
    };
  }

  // ── In-memory fallback (dev local sem Upstash) ────────────────────────────
  const store = new Map<string, { count: number; resetAt: number }>();
  const [amt, unit] = cfg.window.split(" ");
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const windowMs = parseInt(amt) * (multipliers[unit] ?? 60_000);

  return {
    async check(key: string): Promise<CheckResult> {
      const now = Date.now();
      let entry = store.get(key);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }
      entry.count++;
      if (entry.count > cfg.max) {
        const secsLeft = Math.ceil((entry.resetAt - now) / 1000);
        return {
          ok: false, remaining: 0, resetAt: entry.resetAt,
          error: `Muitas requisições. Tente novamente em ${secsLeft}s.`,
        };
      }
      return { ok: true, remaining: cfg.max - entry.count, resetAt: entry.resetAt };
    },
  };
}

// ── Limiters pré-configurados ────────────────────────────────────────────────

/** Chat com mentor — 20 msgs/min por usuário */
export const chatLimiter = createLimiter({ max: 20, window: "1 m", prefix: "chat" });

/** Geração de simulado — 3/min */
export const simuladoLimiter = createLimiter({ max: 3, window: "1 m", prefix: "simulado" });

/** Geração de questões admin — 5/min */
export const questoesGerarLimiter = createLimiter({ max: 5, window: "1 m", prefix: "questoes-gerar" });

/** Edital watch — 2/min */
export const editalLimiter = createLimiter({ max: 2, window: "1 m", prefix: "edital" });

/** Genérico IA — 10/min */
export const defaultAiLimiter = createLimiter({ max: 10, window: "1 m", prefix: "ai-default" });

/** Cadastro — 20 tentativas/5min por IP */
export const signupLimiter = createLimiter({ max: 20, window: "5 m", prefix: "signup" });

/** Login — 10 tentativas/5min por IP */
export const loginLimiter = createLimiter({ max: 10, window: "5 m", prefix: "login" });

/** Checkout — 10/hora por usuário */
export const checkoutLimiter = createLimiter({ max: 10, window: "1 h", prefix: "checkout" });

/** Reset de senha — 3/hora por IP */
export const resetPasswordLimiter = createLimiter({ max: 3, window: "1 h", prefix: "reset-pw" });

/** Reportar questão — 10/hora por usuário (evita spam) */
export const reportarLimiter = createLimiter({ max: 10, window: "1 h", prefix: "reportar" });

/** Exclusão de conta LGPD — 1/hora por usuário (ação destrutiva) */
export const deleteAccountLimiter = createLimiter({ max: 1, window: "1 h", prefix: "delete-account" });

/** Listagem de questões — 30/min por usuário */
export const questoesLimiter = createLimiter({ max: 30, window: "1 m", prefix: "questoes" });

/** Delete de aluno pelo admin — 10/hora (ação destrutiva) */
export const adminDeleteLimiter = createLimiter({ max: 10, window: "1 h", prefix: "admin-delete" });

/** Acesso a flashcard deck — 30/min por usuário */
export const flashcardsLimiter = createLimiter({ max: 30, window: "1 m", prefix: "flashcards" });

/** Auto-erro flashcard (chama IA) — 30/hora por usuário */
export const autoErroLimiter = createLimiter({ max: 30, window: "1 h", prefix: "auto-erro" });

/** Sessão de estudo — 100/hora por usuário */
export const sessaoLimiter = createLimiter({ max: 100, window: "1 h", prefix: "sessao" });

/** Sessão pomodoro — 100/hora por usuário */
export const pomodoroLimiter = createLimiter({ max: 100, window: "1 h", prefix: "pomodoro" });

/** Aprovação de questões admin — 200/hora por admin */
export const adminAprovarLimiter = createLimiter({ max: 200, window: "1 h", prefix: "admin-aprovar" });

/** Upload admin — 50/dia por admin */
export const adminUploadLimiter = createLimiter({ max: 50, window: "1 d", prefix: "admin-upload" });

/** Configurações PATCH — 20/hora por usuário */
export const configuracoesLimiter = createLimiter({ max: 20, window: "1 h", prefix: "configuracoes" });
