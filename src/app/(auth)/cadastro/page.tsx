"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const supabase = createClient();

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // redirectTo legado (usado se template Supabase ainda usar {{ .ConfirmationURL }})
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/workspace`;

    let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"] | null = null;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo, data: { name } },
      });

      if (signUpError || !data.user) {
        const msg = signUpError?.message ?? "";
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          setError("Este e-mail já está cadastrado. Tente fazer login.");
        } else if (msg.includes("rate limit") || msg.includes("email rate")) {
          setError("Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.");
        } else if (msg.includes("invalid")) {
          setError("E-mail inválido.");
        } else if (msg.includes("Password")) {
          setError("Senha muito curta. Use no mínimo 6 caracteres.");
        } else {
          setError(msg || "Erro ao criar conta. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      // Supabase retorna identities=[] quando e-mail já existe mas não foi confirmado
      // Nesse caso, não devemos tentar criar um novo usuário no banco
      if (data.user.identities?.length === 0) {
        setError("Este e-mail já tem um cadastro pendente de confirmação. Verifique sua caixa de entrada ou aguarde 1 hora para tentar novamente.");
        setLoading(false);
        return;
      }

      signUpData = data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro de conexão com autenticação: ${msg}`);
      setLoading(false);
      return;
    }

    // Cria usuário no banco via API
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, supabaseId: signUpData.user!.id }),
      });

      if (!res.ok) {
        let errorMsg = "Erro ao salvar perfil. Tente novamente.";
        try {
          const resData = await res.json();
          const apiMsg = resData?.error ?? "";
          if (res.status === 429 || apiMsg.includes("Muitas")) {
            errorMsg = "Muitas tentativas. Aguarde alguns minutos.";
          } else if (apiMsg) {
            errorMsg = apiMsg;
          }
        } catch {
          errorMsg = `Erro ${res.status} ao salvar perfil.`;
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro de conexão ao salvar perfil: ${msg}`);
      setLoading(false);
      return;
    }

    // Se há sessão ativa (email auto-confirmado), vai para o workspace
    if (signUpData.session) {
      window.location.href = "/workspace";
      return;
    }

    // Email precisa de confirmação manual
    setConfirmEmail(true);
    setLoading(false);
  }

  if (confirmEmail) {
    return (
      <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Confirme seu e-mail</h2>
            <p className="text-gray-400 text-sm mb-6">
              Enviamos um link de confirmação para{" "}
              <strong className="text-white">{email}</strong>.{" "}
              Após confirmar, clique em entrar.
            </p>
            <a
              href="/login"
              className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white text-center transition-colors"
            >
              Ir para o login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-white text-xl font-bold mb-6">Criar sua conta grátis</h1>

          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="aceite"
                required
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-transparent accent-teal-500 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="aceite" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                Li e aceito os{" "}
                <a href="/termos" target="_blank" className="text-teal-400 hover:underline">Termos de Uso</a>
                {" "}e a{" "}
                <a href="/privacidade" target="_blank" className="text-teal-400 hover:underline">Política de Privacidade</a>
                . Confirmo que tenho 18 anos ou mais.
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta grátis"}
            </Button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Já tem conta?{" "}
            <a href="/login" className="text-indigo-400 hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
