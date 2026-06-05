import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" }).catch(() => {});

  // Usa x-forwarded-host (preservado pelo Vercel antes da normalização de URL)
  // para garantir o redirect no domínio correto (www vs sem-www).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "www.aprovai360.com.br";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const response = NextResponse.redirect(`${proto}://${host}/login`);

  // Deleta todos os cookies Supabase sem especificar domain/secure/httpOnly —
  // o browser faz match só pelo nome+path e limpa independente de como foram criados.
  const cookieHeader = request.headers.get("cookie") ?? "";
  cookieHeader
    .split(";")
    .map(c => c.trim().split("=")[0].trim())
    .filter(Boolean)
    .forEach(name => {
      // Delete todos os cookies (sessão Supabase + qualquer cookie de auth)
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    });

  return response;
}
