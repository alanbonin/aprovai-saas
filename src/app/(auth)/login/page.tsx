"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tela = "login" | "forgot" | "forgot-ok";

export default function LoginPage() {
  const [tela, setTela] = useState<Tela>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

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
    // Reload completo garante cookies frescos e evita conflitos de navegação
    // admin é redirecionado para /admin pelo layout; aluno vai para o Briefing do Dia
    window.location.href = "/hoje";
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-senha`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setTela("forgot-ok");
  }

  return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="AprovAI360" className="h-12 w-auto" />
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
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <p className="text-center text-gray-500 text-sm mt-6">
                Não tem conta?{" "}
                <a href="/cadastro" className="text-indigo-400 hover:underline">Cadastrar grátis</a>
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
