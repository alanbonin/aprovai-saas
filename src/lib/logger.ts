/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AprovAI360 — Logger de Segurança Estruturado               ║
 * ║                                                              ║
 * ║  Saída: JSON estruturado para Vercel Log Drain / Axiom      ║
 * ║  LGPD: mascara automaticamente PII e secrets antes de logar ║
 * ║  Manutenção: níveis claros, requestId rastreável, contexto  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * USO:
 *   import { log } from "@/lib/logger";
 *
 *   log.info("user.login", { userId, ip });
 *   log.warn("auth.rate_limit", { ip, endpoint });
 *   log.error("db.query_failed", { table: "User" }, err);
 *   log.security("auth.login_failed", { ip, email: log.maskEmail(email) });
 */

// ── Níveis de log ─────────────────────────────────────────────────────────────
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SECURITY";

// ── Estrutura do log (JSON) ───────────────────────────────────────────────────
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  service: "aprovai360";
  env: string;
  requestId?: string;
  userId?: string;
  ip?: string;
  details?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    // Stack NUNCA logado em produção (info sensível)
  };
}

// ── Patterns de dados sensíveis que NUNCA devem aparecer em logs ──────────────
const SENSITIVE_PATTERNS = [
  /sk-ant-[a-zA-Z0-9-_]{20,}/g,          // Anthropic API key
  /eyJhbGciOiJIUzI1NiJ9\.[a-zA-Z0-9._-]+/g, // JWTs
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,       // Bearer tokens
  /password["']?\s*[:=]\s*["']?[^\s"',]+/gi, // passwords em JSON/query
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,   // CPF
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Cartão de crédito
  /AKIA[A-Z0-9]{16}/g,                    // AWS Access Key
  /ghp_[a-zA-Z0-9]{36}/g,                // GitHub token
];

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    let s = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      s = s.replace(pattern, "[REDACTED]");
    }
    return s;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        // Chaves com nomes sensíveis → redact imediatamente
        const sensitiveKeys = /password|secret|token|key|auth|credential|cpf|rg|cartao|card/i;
        if (sensitiveKeys.test(k)) return [k, "[REDACTED]"];
        return [k, sanitize(v)];
      })
    );
  }
  return value;
}

// ── Mascaramento de PII para LGPD ─────────────────────────────────────────────
export const mask = {
  /** u***@domain.com */
  email(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***@***";
    return `${local.slice(0, 1)}***@${domain}`;
  },

  /** 189.xxx.xxx.xxx (mantém apenas primeiro octeto) */
  ip(ip: string): string {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.xxx.xxx.xxx`;
    return ip.replace(/[^:]+$/, "***"); // IPv6
  },

  /** Jo** Si** */
  name(name: string): string {
    return name.split(" ").map(p => `${p.slice(0, 2)}**`).join(" ");
  },
};

// ── Formatação e saída ────────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === "production";
const IS_DEBUG = process.env.LOG_LEVEL === "DEBUG";

function write(level: LogLevel, event: string, details?: Record<string, unknown>, err?: Error | unknown) {
  // Debug só aparece se explicitamente habilitado
  if (level === "DEBUG" && !IS_DEBUG) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "aprovai360",
    env: process.env.NODE_ENV ?? "unknown",
    ...(details ? { details: sanitize(details) as Record<string, unknown> } : {}),
  };

  if (err) {
    const e = err as Error;
    entry.error = {
      // Em produção, só código genérico — sem stack ou message interna
      message: IS_PROD
        ? sanitizeErrorMessage(e?.message ?? "Erro interno")
        : (e?.message ?? String(err)),
    };
  }

  const output = JSON.stringify(entry);

  // Vercel captura stdout/stderr estruturado
  if (level === "ERROR" || level === "SECURITY") {
    process.stderr.write(output + "\n");
  } else {
    process.stdout.write(output + "\n");
  }
}

/**
 * Remove informações técnicas de mensagens de erro antes de logar em produção.
 * Evita vazar nomes de tabelas, colunas, queries SQL, stack traces.
 */
function sanitizeErrorMessage(msg: string): string {
  // Mensagens genéricas do Supabase/Postgres que vazam estrutura
  if (/relation|column|table|syntax|duplicate key|violates|constraint/i.test(msg)) {
    return "Erro de banco de dados";
  }
  if (/fetch|ECONNREFUSED|ETIMEDOUT|network/i.test(msg)) {
    return "Erro de conectividade";
  }
  if (/JWT|token|unauthorized|forbidden/i.test(msg)) {
    return "Erro de autenticação";
  }
  // Remove paths de arquivo absolutos
  return msg.replace(/\/[a-z][\w/.-]+\.(ts|js|tsx|jsx)/gi, "[arquivo]").slice(0, 200);
}

// ── API pública do logger ─────────────────────────────────────────────────────
export const log = {
  debug:    (event: string, details?: Record<string, unknown>) => write("DEBUG", event, details),
  info:     (event: string, details?: Record<string, unknown>) => write("INFO", event, details),
  warn:     (event: string, details?: Record<string, unknown>, err?: unknown) => write("WARN", event, details, err),
  error:    (event: string, details?: Record<string, unknown>, err?: unknown) => write("ERROR", event, details, err),

  /** Eventos de segurança — sempre logados, mesmo em produção silenciosa */
  security: (event: string, details?: Record<string, unknown>) => write("SECURITY", event, details),

  /** Helpers de mascaramento para uso inline */
  mask,
};

// ── Eventos padronizados (use estas constantes para consistência) ──────────────
export const LogEvent = {
  // Autenticação
  AUTH_LOGIN_OK:      "auth.login_success",
  AUTH_LOGIN_FAIL:    "auth.login_failed",
  AUTH_LOGOUT:        "auth.logout",
  AUTH_REGISTER:      "auth.register",
  AUTH_RESET_PW:      "auth.password_reset",
  AUTH_RATE_LIMITED:  "auth.rate_limited",

  // Autorização
  AUTHZ_DENIED:       "authz.access_denied",
  AUTHZ_ADMIN_ACTION: "authz.admin_action",

  // Dados pessoais (LGPD — acesso a PII)
  LGPD_DATA_ACCESS:   "lgpd.data_accessed",
  LGPD_DATA_EXPORT:   "lgpd.data_exported",
  LGPD_DATA_DELETE:   "lgpd.data_deleted",
  LGPD_CONSENT:       "lgpd.consent_recorded",
  LGPD_REQUEST:       "lgpd.titular_request",

  // Pagamentos
  PAYMENT_CHECKOUT:   "payment.checkout_created",
  PAYMENT_WEBHOOK:    "payment.webhook_received",
  PAYMENT_APPROVED:   "payment.approved",
  PAYMENT_FAILED:     "payment.failed",

  // Rate limiting
  RATE_LIMITED:       "security.rate_limited",

  // Erros
  DB_ERROR:           "db.error",
  AI_ERROR:           "ai.error",
  CRON_RUN:           "cron.executed",
  CRON_AUTH_FAIL:     "cron.auth_failed",

  // Admin
  ADMIN_EXPORT:       "admin.data_exported",
  ADMIN_USER_EDIT:    "admin.user_edited",
  ADMIN_USER_DELETE:  "admin.user_deleted",
} as const;

export default log;
