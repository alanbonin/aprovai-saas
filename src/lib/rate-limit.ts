/**
 * Rate limiter em memória — burst protection por IP/userId.
 *
 * Adequado para MVP em instância única (Vercel Serverless Function = stateless,
 * mas cada cold start/warm instance tem seu próprio estado).
 * Para produção multi-instância, substituir por Upstash Redis.
 *
 * Uso:
 *   const rl = rateLimit({ windowMs: 60_000, max: 5 });
 *   const result = rl.check(userId);
 *   if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Janela em ms (default: 60_000 = 1 min) */
  windowMs?: number;
  /** Máximo de requests na janela (default: 10) */
  max?: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  error?: string;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private max: number;

  constructor(opts: RateLimitOptions = {}) {
    this.windowMs = opts.windowMs ?? 60_000;
    this.max = opts.max ?? 10;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;

    if (entry.count > this.max) {
      const secsLeft = Math.ceil((entry.resetAt - now) / 1000);
      return {
        ok: false,
        remaining: 0,
        resetAt: entry.resetAt,
        error: `Muitas requisições. Tente novamente em ${secsLeft}s.`,
      };
    }

    return {
      ok: true,
      remaining: this.max - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /** Limpa entradas expiradas (chamar periodicamente se necessário) */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) this.store.delete(key);
    }
  }
}

// ── Instâncias pré-configuradas por contexto ─────────────────────────────────

/** Chat e mentor: 20 msgs/min por usuário */
export const chatLimiter = new RateLimiter({ windowMs: 60_000, max: 20 });

/** Geração de simulados: 3 gerações/min por usuário */
export const simuladoLimiter = new RateLimiter({ windowMs: 60_000, max: 3 });

/** Geração de questões admin: 5 gerações/min */
export const questoesGerarLimiter = new RateLimiter({ windowMs: 60_000, max: 5 });

/** Edital Watch verificar: 2/min (chamada cara de IA) */
export const editalLimiter = new RateLimiter({ windowMs: 60_000, max: 2 });

/** Genérico para rotas IA não classificadas: 10/min */
export const defaultAiLimiter = new RateLimiter({ windowMs: 60_000, max: 10 });

/** Factory para criar limiter customizado */
export function rateLimit(opts: RateLimitOptions) {
  return new RateLimiter(opts);
}
