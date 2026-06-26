import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Headers de segurança ──────────────────────────────────────────────────
// IMPORTANTE: este middleware roda em TODA requisição e tem precedência sobre
// os headers definidos em next.config.ts — mantenha os dois sincronizados.
const CSP_HEADER = [
  "default-src 'self'",
  // Meta Pixel + GTM precisam carregar scripts externos
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.mercadopago.com https://www.facebook.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://stats.g.doubleclick.net",
  "worker-src 'self' blob:",
  "frame-src https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const PERMISSIONS_POLICY_HEADER = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=(self)",
  "usb=()",
  "serial=()",
  "hid=()",
  "bluetooth=()",
  "display-capture=()",
  "screen-wake-lock=()",
  "ambient-light-sensor=()",
  "accelerometer=()",
  "gyroscope=()",
  "magnetometer=()",
  "midi=()",
  "picture-in-picture=(self)",
].join(", ");

// ── Rotas de cron — exigem CRON_SECRET no header Authorization ───────────────
// Verificado no middleware para bloquear antes de chegar na route handler
const CRON_PATHS_PREFIX = "/api/cron/";

function checkCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem secret configurado = dev local, deixa passar
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Rotas públicas (sem auth) ────────────────────────────────────────────────
// Rotas de auth: NÃO entram em PUBLIC_PATHS para que usuários autenticados
// sejam redirecionados para /hoje em vez de verem a tela de login/cadastro.
// Usuários não autenticados chegam aqui normalmente (isAuthPage = true → passa).
const PUBLIC_PATHS = new Set([
  "/",
  "/reset-senha",
  "/confirmar-email",
  "/termos",
  "/privacidade",
  "/instalar",
  "/suporte",
  "/planos",
  "/planos/sucesso",
  "/planos/pendente",
  "/offline",
  "/api/auth/callback",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/pagamento/webhook",
  "/api/pagamento/stripe-webhook",
  "/api/icon",
  "/api/og",
  "/api/health",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/sw.js",
]);

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    // Cron e email internos: autenticados via CRON_SECRET (Bearer), não por sessão
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/email/") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js)$/.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // ── Redirect www → apex ──────────────────────────────────────────────────
  if (host === "www.aprovai360.com.br") {
    const url = request.nextUrl.clone();
    url.host = "aprovai360.com.br";
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── Proteção de rotas de cron (produção) ─────────────────────────────────
  if (pathname.startsWith(CRON_PATHS_PREFIX) && process.env.NODE_ENV === "production") {
    if (!checkCronAuth(request)) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Injeta pathname nos headers para server components ───────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  // X-Request-Id: rastreável em logs (correlação request ↔ erro/auditoria)
  requestHeaders.set("x-request-id", crypto.randomUUID());

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // ── Security headers globais ─────────────────────────────────────────────
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", PERMISSIONS_POLICY_HEADER);
  supabaseResponse.headers.set("Content-Security-Policy", CSP_HEADER);
  if (process.env.NODE_ENV === "production") {
    supabaseResponse.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // ── Rotas públicas → passa direto ────────────────────────────────────────
  if (isPublicPath(pathname)) return supabaseResponse;

  // ── Supabase SSR — lê/atualiza cookies da sessão ─────────────────────────
  const supabase = createServerClient(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          // Re-aplica security headers após recriar a response
          supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
          supabaseResponse.headers.set("X-Frame-Options", "DENY");
          supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
          supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
          supabaseResponse.headers.set("Permissions-Policy", PERMISSIONS_POLICY_HEADER);
          supabaseResponse.headers.set("Content-Security-Policy", CSP_HEADER);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/reset-senha");

  // Não autenticado → redirect para login
  if (!user && !isAuthPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Autenticado em página de auth → vai para /hoje
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/hoje", request.url));
  }

  // Nota: verificação de role ADMIN é feita no layout do grupo (admin)/
  // pois a role está no banco (User.role), não no Supabase user_metadata.

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/pagamento/webhook).*)"],
};
