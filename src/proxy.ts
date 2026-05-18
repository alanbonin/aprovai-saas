import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Rotas públicas (sem auth) ────────────────────────────────────────────────
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/cadastro",
  "/reset-senha",
  "/termos",
  "/privacidade",
  "/api/auth/callback",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/pagamento/webhook",
  "/api/icon",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
]);

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js)$/.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Injeta pathname nos headers para server components ───────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // ── Security headers globais ─────────────────────────────────────────────
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.mercadopago.com; frame-ancestors 'none';"
  );
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
          supabaseResponse.headers.set(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.mercadopago.com; frame-ancestors 'none';"
          );
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

  // Autenticado em página de auth → vai para workspace
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  // Nota: verificação de role ADMIN é feita no layout do grupo (admin)/
  // pois a role está no banco (User.role), não no Supabase user_metadata.

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/pagamento/webhook).*)"],
};
