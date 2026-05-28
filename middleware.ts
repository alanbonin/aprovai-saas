/**
 * Next.js Middleware — ponto de entrada.
 * Toda a lógica está em src/proxy.ts para facilitar manutenção.
 *
 * Responsabilidades (veja src/proxy.ts):
 * - Redirect www → apex
 * - Proteção de /api/cron/* com CRON_SECRET em produção
 * - Auth: redireciona não-autenticados para /login
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - X-Request-Id rastreável para correlação de logs
 */
export { proxy as middleware } from "@/proxy";

// config deve ser definido estaticamente aqui (Next.js não aceita re-export)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/pagamento/webhook).*)"],
};
