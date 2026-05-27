/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AprovAI360 — Next.js Middleware de Segurança              ║
 * ║                                                              ║
 * ║  Responsabilidades:                                         ║
 * ║  1. Bloquear acesso não-autenticado a /workspace e /admin  ║
 * ║  2. Adicionar headers de segurança globais                 ║
 * ║  3. Bloquear rotas de cron sem CRON_SECRET                 ║
 * ║  4. Adicionar requestId rastreável a todas as respostas    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rotas que exigem sessão autenticada
const PROTECTED_PREFIXES = ["/workspace", "/admin", "/onboarding"];

// Rotas de cron que exigem CRON_SECRET (Vercel Cron scheduler)
const CRON_PREFIX = "/api/cron/";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = crypto.randomUUID();

  // ── 1. Proteção de rotas de cron ─────────────────────────────────────────────
  // Crons devem vir com Authorization: Bearer <CRON_SECRET> (Vercel Cron ou fetch interno)
  // Só bloqueia em produção E quando o secret está configurado
  if (pathname.startsWith(CRON_PREFIX)) {
    const secret = process.env.CRON_SECRET;
    if (secret && process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${secret}`) {
        return new NextResponse(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
        });
      }
    }
  }

  // ── 2. Proteção de páginas autenticadas ──────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (isProtected) {
    // Cria cliente Supabase com cookies do request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() { /* read-only no middleware */ },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // ── 3. Passthrough com headers de segurança adicionais ───────────────────────
  const response = NextResponse.next();

  // X-Request-Id: rastreável em logs (correlação de request com erro/audit)
  response.headers.set("X-Request-Id", requestId);

  // Remove headers que revelam tecnologia (já feito no next.config, mas garante no edge)
  response.headers.delete("X-Powered-By");

  return response;
}

export const config = {
  // Inclui todas as rotas exceto arquivos estáticos e _next internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/health|api/icon|og|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$).*)",
  ],
};
