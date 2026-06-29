"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Tela = "login" | "forgot" | "forgot-ok";

export default function LoginPage() {
  const [tela, setTela] = useState<Tela>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Lê mensagens de erro/sucesso vindas do callback de confirmação de e-mail
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const erro = params.get("erro");
    const confirmado = params.get("confirmado");
    const aviso = params.get("aviso");
    if (erro) setError(decodeURIComponent(erro));
    if (confirmado) setInfo("E-mail confirmado! Faça login para acessar sua conta.");
    if (aviso === "sessao_encerrada") setError("Sua sessão foi encerrada porque sua conta foi acessada em outro dispositivo.");
    // Flag gravada pelo SessionGuard (localStorage persiste após redirect server-side)
    try {
      const kickedOut = localStorage.getItem("kicked_out");
      const wasLoggedIn = localStorage.getItem("was_logged_in");
      if (kickedOut) {
        localStorage.removeItem("kicked_out");
        localStorage.removeItem("was_logged_in");
        setError("⚠️ Sua sessão foi encerrada porque esta conta foi acessada em outro dispositivo.");
      } else if (wasLoggedIn) {
        // Servidor redirecionou sem o SessionGuard ter rodado — sessão revogada externamente
        localStorage.removeItem("was_logged_in");
        setError("⚠️ Sua sessão foi encerrada porque esta conta foi acessada em outro dispositivo.");
      }
    } catch {}
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    // Revoga todas as outras sessões ativas — impede compartilhamento de conta
    // Se o usuário logar em outro dispositivo, as sessões anteriores são invalidadas
    await supabase.auth.signOut({ scope: "others" }).catch(() => {});
    // Reload completo garante cookies frescos e evita conflitos de navegação
    // admin é redirecionado para /admin pelo layout; aluno vai para o Briefing do Dia
    window.location.href = "/hoje";
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-senha`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setTela("forgot-ok");
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
          {tela === "login" && (
            <>
              <h1 className="text-white text-xl font-bold mb-6">Entrar na plataforma</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="seu@email.com" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-gray-400">Senha</label>
                    <button type="button" onClick={() => { setTela("forgot"); setError(""); }}
                      className="text-xs text-indigo-400 hover:underline">
                      Esqueci minha senha
                    </button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="••••••••" />
                </div>
                {info  && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{info}</p>}
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <p className="text-center text-gray-500 text-sm mt-6">
                Não tem conta?{" "}
                <a href="/cadastro" className="text-indigo-400 hover:underline">Cadastrar grátis</a>
              </p>
              <p className="text-center text-[11px] text-gray-600 mt-4">
                Ao entrar, você concorda com nossos{" "}
                <a href="/termos" target="_blank" className="text-gray-500 hover:text-teal-400 transition-colors">Termos de Uso</a>
                {" "}e{" "}
                <a href="/privacidade" target="_blank" className="text-gray-500 hover:text-teal-400 transition-colors">Política de Privacidade</a>
              </p>
            </>
          )}

          {tela === "forgot" && (
            <>
              <button onClick={() => { setTela("login"); setError(""); }} className="text-xs text-gray-500 hover:text-white mb-4 flex items-center gap-1">
                ← Voltar ao login
              </button>
              <h1 className="text-white text-xl font-bold mb-2">Recuperar senha</h1>
              <p className="text-gray-500 text-sm mb-6">Enviaremos um link de redefinição para seu e-mail.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="seu@email.com" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            </>
          )}

          {tela === "forgot-ok" && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">E-mail enviado!</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enviamos um link para <strong className="text-white">{email}</strong>. Verifique sua caixa de entrada.
              </p>
              <button onClick={() => { setTela("login"); setError(""); }}
                className="text-indigo-400 text-sm hover:underline">
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
