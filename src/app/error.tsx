"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    // Log para Sentry quando configurado
    if (process.env.NODE_ENV === "production") {
      console.error("[AprovAI360 Error]", error.digest, error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Algo deu errado</h1>
        <p className="text-gray-400 text-sm mb-1">
          Ocorreu um erro inesperado. Nosso time já foi notificado.
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs font-mono mb-6">
            Código: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/hoje"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
