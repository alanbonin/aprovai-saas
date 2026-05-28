/**
 * Next.js Middleware — Edge Runtime
 *
 * Responsabilidades minimalistas (sem Supabase SSR — auth é feito nos layouts):
 * 1. Redirect www.aprovai360.com.br → aprovai360.com.br (apex)
 * 2. Proteção de /api/cron/* com CRON_SECRET em produção
 * 3. X-Request-Id em todas as respostas (rastreabilidade de logs)
 *
 * Auth (login redirect, admin guard) → layout.tsx de cada grupo de rotas.
 * Security headers (CSP, HSTS, etc.) → next.config.ts (headers()).
 */
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // ── 1. Redirect www → apex ────────────────────────────────────────────────
  if (host === "www.aprovai360.com.br") {
    const url = request.nextUrl.clone();
    url.host = "aprovai360.com.br";
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── 2. Proteção de /api/cron/* (Vercel Cron Job) ─────────────────────────
  // Em produção, exige Authorization: Bearer <CRON_SECRET>
  // O Vercel Cron injeta o header automaticamente; protege contra invocação externa.
  if (pathname.startsWith("/api/cron/") && process.env.NODE_ENV === "production") {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return new NextResponse(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // ── 3. Passthrough com X-Request-Id ──────────────────────────────────────
  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("X-Request-Id", requestId);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/pagamento/webhook).*)"],
};
