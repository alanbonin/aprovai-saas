"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function PagoPendentePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  function handleVerificar() {
    setChecking(true);
    router.refresh();
    // Reset visual após 2s para o caso de não haver redirect
    setTimeout(() => setChecking(false), 2000);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-base, #080c18)" }}
    >
      <div className="max-w-md w-full text-center">
        {/* Ícone de relógio âmbar */}
        <div className="w-24 h-24 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-12 h-12 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Pagamento em processamento
        </h1>

        <p className="text-gray-400 mb-2">
          Seu pagamento está sendo analisado. Assim que confirmado, seu plano
          será ativado automaticamente.
        </p>
        <p className="text-xs text-gray-600 mb-8">
          Tempo médio: alguns minutos a algumas horas.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleVerificar}
            disabled={checking}
            className="w-full py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando…
              </>
            ) : (
              "Verificar status"
            )}
          </button>

          <Link
            href="/hoje"
            className="block w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
