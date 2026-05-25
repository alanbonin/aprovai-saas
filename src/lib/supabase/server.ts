import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  // Usa SUPABASE_URL / SUPABASE_ANON_KEY (sem NEXT_PUBLIC_) para evitar
  // que o Turbopack inline undefined nos chunks SSR quando a var não estava
  // presente no build anterior (cache). Fallback para NEXT_PUBLIC_ em local dev.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
