import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const AUTH_ROUTES = ["/login", "/cadastro", "/confirmar-email", "/reset-senha"];

const PROTECTED_PREFIX = [
  "/hoje", "/dashboard", "/questoes", "/simulado", "/flashcards",
  "/arena", "/ranking", "/perfil", "/configuracoes", "/metas",
  "/cronograma", "/conquistas", "/notas", "/mentor", "/plano-semanal",
  "/agenda-revisoes", "/caderno-erros", "/calculadora", "/caso",
  "/comparar", "/desafio", "/desafio-semanal", "/diagnostico", "/diario",
  "/edital-watch", "/favoritos", "/glossario", "/grupos", "/historico-simulados",
  "/materiais", "/nivel", "/notificacoes", "/pomodoro", "/quiz",
  "/redacao", "/relatorio", "/resumo-semanal", "/revisao", "/semana",
  "/sessao", "/timeline", "/workspace", "/artigos", "/bancas",
  "/biblioteca", "/adaptativo", "/onboarding",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user && AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "?"))) {
    return NextResponse.redirect(new URL("/hoje", request.url));
  }

  if (!user && PROTECTED_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$|api/).*)",
  ],
};
