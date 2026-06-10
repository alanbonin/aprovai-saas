"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase redireciona com #access_token na URL (hash fragment).
    // getSession() pode ser chamado antes do cliente processar o hash —
    // usamos onAuthStateChange para capturar o evento PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Sessão pronta — usuário pode digitar a nova senha
        return;
      }
      if (event === "SIGNED_IN" && session) {
        // Também aceita SIGNED_IN que pode disparar junto com PASSWORD_RECOVERY
        return;
      }
    });

    // Fallback: após 1.5s se ainda não há sessão, redireciona para login
    const fallback = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    if (password.length < 6) { setError("Senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/hoje"), 2500);
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
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-white font-bold text-lg mb-2">Senha atualizada!</h2>
              <p className="text-gray-400 text-sm">Redirecionando para o dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="text-white text-xl font-bold mb-2">Nova senha</h1>
              <p className="text-gray-500 text-sm mb-6">Digite sua nova senha abaixo.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nova senha</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="mínimo 6 caracteres" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Confirmar senha</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="repita a senha" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
