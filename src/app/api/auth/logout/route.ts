import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });

  // Redireciona para /login mantendo o mesmo origin da requisição (www vs sem-www)
  // para que os cookies deletados pelo signOut sejam aplicados no domínio correto.
  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);

  // Garante exclusão explícita dos cookies de sessão Supabase no response,
  // independente de como o Next.js propaga cookies() para o NextResponse.
  const cookieStore = await cookies();
  cookieStore.getAll()
    .filter(c => c.name.startsWith("sb-"))
    .forEach(c => response.cookies.delete(c.name));

  return response;
}
