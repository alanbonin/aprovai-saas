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

  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const hash = window.location.hash?.substring(1) ?? "";
    const search = window.location.search ?? "";
    const hashParams = new URLSearchParams(hash);
    const searchParams2 = new URLSearchParams(search);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");
    const code = searchParams2.get("code");

    setDebugInfo(
      `hash_type=${hashType ?? "none"} | has_token=${!!accessToken} | has_code=${!!code} | hash_len=${hash.length}`
    );

    // Listener registrado PRIMEIRO para não perder o evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setEstado("pronto");
      }
    });

    // Fluxo implicit: tokens direto no hash
    if (accessToken && (hashType === "recovery" || hashType === "signup")) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? "",
      }).then(({ error }) => {
        if (!error) setEstado("pronto");
        else setEstado("invalido");
      });
      return () => subscription.unsubscribe();
    }

    // Fluxo PKCE: code na query string
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) setEstado("pronto");
        else setEstado("invalido");
      });
      return () => subscription.unsubscribe();
    }

    // Verifica sessão já existente (ex: server-side callback)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setEstado("pronto");
    });

    const fallback = setTimeout(() => {
      setEstado(prev => prev === "aguardando" ? "invalido" : prev);
    }, 10000);

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
              {debugInfo && (
                <p className="text-gray-600 text-xs mb-4 font-mono break-all">{debugInfo}</p>
              )}
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
