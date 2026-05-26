/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AprovAI360 — Instrumentação de Servidor (Next.js)          ║
 * ║                                                              ║
 * ║  Executa uma vez ao iniciar o servidor (Edge + Node).       ║
 * ║  Redireciona console.* para o logger estruturado,           ║
 * ║  garantindo que TODOS os logs sigam o formato JSON e        ║
 * ║  apliquem mascaramento automático de PII/secrets.            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

export async function register() {
  // Só executa no runtime Node.js (não no Edge)
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { log } = await import("@/lib/logger");

    // ── Override de console → logger estruturado ─────────────────────────────
    // Preserva o console original para casos onde não queremos overhead
    const _warn  = console.warn.bind(console);

    console.log = (...args: unknown[]) => {
      log.debug("console.log", { msg: args.map(String).join(" ") });
    };

    console.warn = (...args: unknown[]) => {
      log.warn("console.warn", { msg: args.map(String).join(" ") });
    };

    console.error = (...args: unknown[]) => {
      // Extrai o Error se vier como último argumento
      const lastArg = args[args.length - 1];
      const err = lastArg instanceof Error ? lastArg : undefined;
      const msg = args
        .filter(a => a !== err)
        .map(a => (a instanceof Error ? a.message : String(a)))
        .join(" ");
      log.error("console.error", { msg }, err);
    };

    console.info = (...args: unknown[]) => {
      log.info("console.info", { msg: args.map(String).join(" ") });
    };

    // Avisa que o override foi instalado (só em dev para não poluir produção)
    if (process.env.NODE_ENV !== "production") {
      _warn("[instrumentation] console.* → structured logger ativo");
    }
  }
}
