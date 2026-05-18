import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

interface Props {
  searchParams: Promise<{ plan?: string }>;
}

export default async function PagoSucessoPage({ searchParams }: Props) {
  const params = await searchParams;
  const planSlug = params.plan;

  // Formata o nome do plano a partir do slug para exibição
  const planName = planSlug
    ? planSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-base, #080c18)" }}
    >
      <div className="max-w-md w-full text-center">
        {/* Ícone de check verde */}
        <div className="w-24 h-24 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Pagamento aprovado! 🎉
        </h1>

        <p className="text-gray-400 mb-1">
          {planName
            ? `Seu plano ${planName} foi ativado com sucesso.`
            : "Sua assinatura foi ativada com sucesso."}
        </p>
        <p className="text-xs text-gray-600 mb-8">
          Você receberá um e-mail de confirmação em breve.
        </p>

        <div className="space-y-3">
          <Link
            href="/workspace"
            className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
          >
            Ir para meu workspace →
          </Link>
          <Link
            href="/planos"
            className="block w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Ver detalhes do plano
          </Link>
        </div>
      </div>
    </div>
  );
}
