"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Estado = "aguardando" | "pronto" | "invalido";

export default function ResetSenhaPage() {
  const [estado, setEstado] = useState<Estado>("aguardando");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Fluxo PKCE: callback já trocou o code por sessão e redirecionou com ?recovery=1
    if (searchParams.get("recovery") === "1") {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setEstado("pronto");
        } else {
          setEstado("invalido");
        }
      });
      return;
    }

    // Fluxo hash (legado): aguarda evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setEstado("pronto");
      }
    });

    // Se após 5s não recebeu PASSWORD_RECOVERY, token inválido ou expirado
    const fallback = setTimeout(() => {
      setEstado(prev => prev === "aguardando" ? "invalido" : prev);
    }, 5000);

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
    // Faz logout e redireciona para login — força nova autenticação com a nova senha
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login?msg=senha-atualizada"), 2500);
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
              <p className="text-gray-400 text-sm">Redirecionando para o login...</p>
            </div>
          ) : estado === "aguardando" ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Verificando link...</p>
            </div>
          ) : estado === "invalido" ? (
            <div className="text-center py-4">
              <p className="text-red-400 font-semibold mb-2">Link inválido ou expirado</p>
              <p className="text-gray-500 text-sm mb-4">Solicite um novo link de redefinição de senha.</p>
              <button
                onClick={() => router.push("/login")}
                className="text-indigo-400 text-sm underline"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-white text-xl font-bold mb-2">Nova senha</h1>
              <p className="text-gray-500 text-sm mb-6">Digite sua nova senha abaixo.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nova senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="repita a senha"
                  />
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
