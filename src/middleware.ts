import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Caminhos que NÃO devem ser redirecionados mesmo com subscription expirada
const BYPASS_PATHS = [
  "/planos",
  "/configuracoes",
  "/suporte",
  "/login",
  "/cadastro",
  "/onboarding",
  "/api",
  "/_next",
  "/favicon",
  "/icons",
  "/manifest",
];

function isBypassPath(pathname: string): boolean {
  return BYPASS_PATHS.some(p => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Não verifica para caminhos estáticos, api, etc.
  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  // Só verifica rotas do dashboard
  const isDashboardRoute =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/cadastro") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next");

  if (!isDashboardRoute) return NextResponse.next();

  // Cria cliente Supabase para middleware (usa cookies)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Verifica sessão do usuário
  const { data: { user } } = await supabase.auth.getUser();

  // Não autenticado → deixa o layout lidar com o redirect para /login
  if (!user) return response;

  // Busca subscription diretamente via REST (sem Prisma no middleware)
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

    // Busca o User pelo supabaseId para pegar o ID interno
    const userRes = await fetch(
      `${apiUrl}/rest/v1/User?supabaseId=eq.${user.id}&select=id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        // Cache de 30s para não consultar a cada request
        next: { revalidate: 30 },
      }
    );

    if (!userRes.ok) return response;
    const users = await userRes.json();
    if (!users?.length) return response;

    const userId = users[0].id;

    // Busca subscription com endDate
    const subRes = await fetch(
      `${apiUrl}/rest/v1/Subscription?userId=eq.${userId}&select=endDate,status&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        next: { revalidate: 30 },
      }
    );

    if (!subRes.ok) return response;
    const subs = await subRes.json();

    // Sem subscription ou expirada → redireciona para /planos
    if (!subs?.length) {
      return NextResponse.redirect(new URL("/planos", request.url));
    }

    const sub = subs[0];
    const isExpired =
      sub.status === "EXPIRED" ||
      sub.status === "CANCELLED" ||
      (sub.endDate && new Date(sub.endDate) < new Date());

    if (isExpired) {
      return NextResponse.redirect(new URL("/planos", request.url));
    }
  } catch {
    // Em caso de erro, não bloqueia o usuário
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica middleware a todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest).*)",
  ],
};
