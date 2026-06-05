import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  // Invalida a sessão no servidor Supabase
  await supabase.auth.signOut({ scope: "global" }).catch(() => {});

  const redirectUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(redirectUrl);

  // Lê os nomes dos cookies diretamente do header da requisição e os deleta
  // explicitamente na resposta — garante que o browser limpe a sessão SSR
  // independente de como o Next.js propaga cookies() para o NextResponse.
  const cookieHeader = request.headers.get("cookie") ?? "";
  cookieHeader
    .split(";")
    .map(c => c.trim().split("=")[0].trim())
    .filter(name => name && (name.startsWith("sb-") || name.includes("supabase") || name.includes("token")))
    .forEach(name => {
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/",
        sameSite: "lax",
        secure: true,
        httpOnly: true,
      });
    });

  return response;
}
