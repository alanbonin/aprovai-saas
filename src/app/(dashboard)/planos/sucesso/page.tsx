import Link from "next/link";

export default function PagoSucessoPage() {
  return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6 text-4xl">
          🎉
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Pagamento aprovado!</h1>
        <p className="text-gray-400 mb-2">
          Sua assinatura foi ativada com sucesso. Bem-vindo ao Aprovai!
        </p>
        <p className="text-xs text-gray-600 mb-8">
          Você receberá um e-mail de confirmação em breve.
        </p>
        <div className="space-y-3">
          <Link href="/workspace"
            className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
            🚀 Acessar meu workspace →
          </Link>
          <Link href="/planos"
            className="block w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-colors">
            Ver detalhes do plano
          </Link>
        </div>
      </div>
    </div>
  );
}
