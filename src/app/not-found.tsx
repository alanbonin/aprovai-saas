import Link from "next/link";
import { Trophy, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080c18] text-white flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
        <Trophy className="w-8 h-8 text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-6xl font-black text-indigo-500 mb-2">404</p>
        <h1 className="text-xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-gray-500 text-sm">O endereço que você acessou não existe ou foi movido.</p>
      </div>
      <Link href="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
        <Home className="w-4 h-4" /> Voltar ao início
      </Link>
    </div>
  );
}
