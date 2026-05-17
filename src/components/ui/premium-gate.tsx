"use client";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";

interface Props {
  recurso: string;
  descricao?: string;
}

export function PremiumGate({ recurso, descricao }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-indigo-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{recurso} é Premium</h2>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        {descricao ?? "Este recurso está disponível apenas para assinantes. Faça upgrade e desbloqueie tudo."}
      </p>
      <Link href="/planos"
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-medium text-sm transition-colors">
        <Zap className="w-4 h-4" /> Ver planos e fazer upgrade
      </Link>
      <Link href="/dashboard" className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors">
        Voltar ao início
      </Link>
    </div>
  );
}
