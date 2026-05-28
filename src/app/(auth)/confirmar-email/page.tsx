"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * /confirmar-email
 *
 * Página intermediária que recebe token_hash e type vindos do template de e-mail
 * do Supabase. Exige um clique do usuário antes de verificar o token.
 *
 * Por que isso é necessário:
 * Clientes de e-mail como Gmail pré-carregam links para verificação de spam.
 * Se o link fosse direto para /api/auth/callback, o Gmail "usaria" o token
 * antes do usuário clicar, causando o erro "Email link is invalid or has expired".
 *
 * Aqui, o token só é consumido quando o usuário clica no botão — o Gmail
 * busca o HTML mas não executa eventos de clique JavaScript.
 */
export default function ConfirmarEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "signup") as EmailOtpType;
  const next = searchParams.get("next") ?? "/workspace";

  // Se não houver token_hash, redireciona para login
  useEffect(() => {
    if (!tokenHash) {
      router.replace("/login");
    }
  }, [tokenHash, router]);

  async function handleConfirm() {
    if (!tokenHash) return;
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message.includes("expired") || error.message.includes("invalid")
          ? "O link de confirmação expirou ou já foi utilizado. Solicite um novo cadastro."
          : "Erro ao confirmar e-mail. Tente novamente."
      );
      return;
    }
    setStatus("success");
    // Pequeno delay para mostrar o sucesso antes de redirecionar
    setTimeout(() => {
      window.location.href = next;
    }, 1200);
  }

  if (!tokenHash) return null;

  return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" className="w-10 h-10" />
          <div className="text-left">
            <p className="font-bold text-lg leading-tight">
              <span className="text-white">Aprov</span>
              <span style={{ color: "#0ab5bd" }}>AI</span>
              <span className="text-white">360</span>
            </p>
            <p className="text-[11px] text-gray-500">Estudo inteligente. Aprovação garantida.</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          {status === "idle" && (
            <>
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">✉️</span>
              </div>
              <h1 className="text-white text-xl font-bold mb-2">Confirmar e-mail</h1>
              <p className="text-gray-400 text-sm mb-6">
                Clique no botão abaixo para confirmar seu endereço de e-mail e acessar a plataforma.
              </p>
              <button
                onClick={handleConfirm}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl text-white font-semibold text-sm transition-all"
              >
                Confirmar e-mail e entrar →
              </button>
            </>
          )}

          {status === "loading" && (
            <>
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-5 animate-pulse">
                <span className="text-3xl">🔄</span>
              </div>
              <p className="text-gray-400 text-sm">Confirmando seu e-mail...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">E-mail confirmado!</h2>
              <p className="text-gray-400 text-sm">Entrando na plataforma...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Link inválido</h2>
              <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
              <a
                href="/cadastro"
                className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white text-center transition-colors"
              >
                Criar nova conta
              </a>
              <a href="/login" className="block mt-3 text-sm text-indigo-400 hover:underline">
                Já tenho conta — fazer login
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
