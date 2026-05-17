import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── Rotas que exigem autenticação ────────────────────────────────────────────
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/hoje",
  "/workspace",
  "/mentor",
  "/simulado",
  "/flashcards",
  "/questoes",
  "/relatorio",
  "/resumo-semanal",
  "/historico-simulados",
  "/revisao",
  "/agenda-revisoes",
  "/caderno-erros",
  "/favoritos",
  "/adaptativo",
  "/desafio",
  "/quiz",
  "/desafio-semanal",
  "/conquistas",
  "/perfil",
  "/planos",
  "/artigos",
  "/glossario",
  "/materiais",
  "/caso",
  "/redacao",
  "/admin",
  "/api/mentor",
  "/api/workspace",
  "/api/simulado",
  "/api/flashcards",
  "/api/questoes",
  "/api/relatorio",
  "/api/perfil",
  "/api/admin",
  "/api/me",
  "/api/email/lembrete",
  "/api/email/relatorio-semanal",
  "/api/email/questao-do-dia",
];

// Rotas de admin (exigem role === "ADMIN")
const ADMIN_PREFIXES = ["/admin", "/api/admin"];

// Rotas públicas que nunca precisam de auth
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/cadastro",
  "/api/auth/callback",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/pagamento/webhook",
  "/api/icon",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
]);

function isProtected(path: string): boolean {
  return PROTECTED_PREFIXES.some(p => path.startsWith(p));
}

function isAdmin(path: string): boolean {
  return ADMIN_PREFIXES.some(p => path.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Segurança: headers globais ───────────────────────────────────────────
  const res = NextResponse.next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // ── Rotas públicas — passa direto ───────────────────────────────────────
  if (PUBLIC_PATHS.has(pathname)) return res;

  // ── Só verifica auth em rotas protegidas ────────────────────────────────
  if (!isProtected(pathname)) return res;

  // ── Verificar sessão via Supabase SSR ───────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Não autenticado → redirect para login
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rota de admin → verificar role no user_metadata ou no banco
  if (isAdmin(pathname)) {
    const role = user.user_metadata?.role as string | undefined;
    // Se não tem role no metadata, tenta verificar pelo header do banco
    // (a role definitiva está no campo User.role do banco, mas para não
    // fazer query no middleware, usamos o metadata setado no cadastro)
    if (role !== "ADMIN") {
      // Redireciona alunos comuns para o dashboard
      const dashUrl = req.nextUrl.clone();
      dashUrl.pathname = "/hoje";
      return NextResponse.redirect(dashUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - arquivos com extensão (public/)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js)$).*)",
  ],
};
