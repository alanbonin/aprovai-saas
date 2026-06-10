"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function CadastroPage() {
  const searchParams = useSearchParams();
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (searchParams.get("deleted") === "1") setDeleted(true);
  }, [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const supabase = createClient();

  // ── Validação de senha ──────────────────────────────────────────────────────
  const SENHAS_COMUNS = new Set([
    "123456","123456789","12345678","12345","1234567","password","senha","qwerty",
    "abc123","111111","000000","iloveyou","admin","letmein","monkey","dragon",
    "master","sunshine","princess","welcome","shadow","superman","michael",
    "football","baseball","696969","123123","654321","superman","batman",
    "concurso","aprovai","estudar","passar","aprovado","gabarito",
  ]);

  function avaliarSenha(s: string): { ok: boolean; forca: 0|1|2|3; erros: string[] } {
    const erros: string[] = [];
    if (s.length < 8)           erros.push("Mínimo 8 caracteres");
    if (!/[a-zA-Z]/.test(s))    erros.push("Pelo menos 1 letra");
    if (!/[0-9]/.test(s))       erros.push("Pelo menos 1 número");
    if (SENHAS_COMUNS.has(s.toLowerCase())) erros.push("Senha muito comum — escolha outra");

    const forca: 0|1|2|3 =
      erros.length === 0 && s.length >= 12 && /[^a-zA-Z0-9]/.test(s) ? 3 :
      erros.length === 0 && s.length >= 10 ? 2 :
      erros.length === 0 ? 1 : 0;

    return { ok: erros.length === 0, forca, erros };
  }

  const senhaInfo = avaliarSenha(password);

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Valida senha antes de chamar Supabase
    if (!senhaInfo.ok) {
      setError(senhaInfo.erros[0]);
      setLoading(false);
      return;
    }

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
            <p className="text-gray-400 text-sm mb-4">
              Enviamos um link de confirmação para{" "}
              <strong className="text-white">{email}</strong>.
            </p>

            {/* Aviso sobre spam */}
            <div className="bg-amber-100 border border-amber-400 rounded-xl px-4 py-3 mb-5 text-left">
              <p className="text-amber-800 text-xs font-bold mb-1">⚠️ Não recebeu o e-mail?</p>
              <p className="text-amber-900 text-xs leading-relaxed">
                Verifique sua <strong>caixa de spam</strong> ou <strong>lixo eletrônico</strong> — às vezes nossos e-mails chegam por lá.
              </p>
              <p className="text-amber-900 text-xs leading-relaxed mt-1.5">
                Ao confirmar, <strong>marque o e-mail como &quot;Não é spam&quot;</strong> para que as próximas mensagens cheguem direto na caixa de entrada.
              </p>
            </div>

            <a
              href="/login"
              className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white text-center transition-colors"
            >
              Já confirmei — ir para o login
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

        {deleted && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25 text-sm text-green-300 text-center">
            Sua conta foi excluída com sucesso. Você pode criar uma nova conta abaixo.
          </div>
        )}

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
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Mínimo 8 caracteres, com letra e número"
              />
              {/* Indicador de força — aparece assim que o usuário começa a digitar */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {/* Barra de força */}
                  <div className="flex gap-1">
                    {[1,2,3].map(n => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          senhaInfo.forca >= n
                            ? n === 1 ? "bg-red-400"
                            : n === 2 ? "bg-yellow-400"
                            : "bg-emerald-400"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  {/* Texto de status */}
                  <p className={`text-xs ${
                    senhaInfo.forca === 3 ? "text-emerald-400" :
                    senhaInfo.forca === 2 ? "text-yellow-400" :
                    senhaInfo.forca === 1 ? "text-orange-400" : "text-red-400"
                  }`}>
                    {senhaInfo.forca === 3 ? "✓ Senha forte" :
                     senhaInfo.forca === 2 ? "Senha boa — adicione símbolos para ficar mais forte" :
                     senhaInfo.forca === 1 ? "Senha fraca — adicione mais caracteres" :
                     senhaInfo.erros[0]}
                  </p>
                </div>
              )}
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
