import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  // Invalida a sessão no lado do servidor (revoga refresh token globalmente)
  await supabase.auth.signOut({ scope: "global" }).catch(() => {});

  // Retorna 200 com Set-Cookie para limpar todos os cookies de auth.
  // O cliente (sidebar.tsx) navega para /login após receber esta resposta.
  // Não usamos redirect aqui para evitar problemas com www→apex no middleware.
  const response = new NextResponse(null, { status: 200 });

  const cookieHeader = request.headers.get("cookie") ?? "";
  cookieHeader
    .split(";")
    .map(c => c.trim().split("=")[0].trim())
    .filter(Boolean)
    .forEach(name => {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    });

  return response;
}
