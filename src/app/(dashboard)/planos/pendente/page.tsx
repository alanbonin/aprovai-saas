import Link from "next/link";

export default function PagoPendentePage() {
  return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-4xl">
          ⏳
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Pagamento em processamento</h1>
        <p className="text-gray-400 mb-2">
          Seu pagamento está sendo processado. Isso pode levar alguns minutos.
        </p>
        <p className="text-xs text-gray-600 mb-8">
          Assim que for confirmado, sua assinatura será ativada automaticamente e você receberá um e-mail.
        </p>
        <div className="space-y-3">
          <Link href="/workspace"
            className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
            Acessar workspace (acesso básico)
          </Link>
          <Link href="/planos"
            className="block w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-colors">
            Voltar aos planos
          </Link>
        </div>
      </div>
    </div>
  );
}
