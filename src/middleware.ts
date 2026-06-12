import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware mínimo: injeta o pathname atual como header para que layouts
 * server-side possam ler o caminho da requisição (ex: para guard de expiração).
 * Não acessa banco de dados — zero latência adicional.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  // Aplica a todas as rotas do dashboard e APIs, exclui assets estáticos
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js|robots.txt|sitemap.xml|api/og|api/icon).*)",
  ],
};
