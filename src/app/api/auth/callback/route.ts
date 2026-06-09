import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, LogEvent } from "@/lib/logger";

/**
 * GET /api/auth/callback
 *
 * Callback do Supabase após confirmação de e-mail ou OAuth.
 * Troca o "code" por uma sessão válida e redireciona o usuário.
 *
 * Fluxo:
 *  1. Supabase envia e-mail de confirmação com link para /api/auth/callback?code=xxx
 *  2. Este handler troca o code por uma sessão (cookies)
 *  3. Redireciona para /workspace (onboarding detecta se é primeira vez)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/workspace";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Supabase pode redirecionar com erro (ex: link expirado)
  if (error) {
    log.warn("auth.callback_error", { error, description: errorDescription });
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        log.warn("auth.callback_exchange_failed", { error: exchangeError.message });
        return NextResponse.redirect(
          `${origin}/login?erro=Link+de+confirmação+inválido+ou+expirado`
        );
      }

      log.info(LogEvent.AUTH_LOGIN_OK, { userId: data.user?.id ?? "unknown", via: "email_confirmation" });

      // Revoga todas as outras sessões — impede compartilhamento de conta
      await supabase.auth.signOut({ scope: "others" }).catch(() => {});

      // Redireciona para workspace — o onboarding detecta se é primeira vez
      // Bloqueia protocol-relative URLs (//evil.com) que passam no startsWith("/")
      const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/workspace";
      const redirectUrl = new URL(safePath, origin);
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      log.error("auth.callback_exception", {}, err);
      return NextResponse.redirect(`${origin}/login?erro=Erro+interno`);
    }
  }

  // Sem code → redireciona para login
  return NextResponse.redirect(`${origin}/login`);
}
