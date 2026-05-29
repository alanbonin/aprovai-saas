"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Zap, Lock } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  recurso?: string;
}

export function UpgradeModal({ open, onClose, recurso }: UpgradeModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0f1629 0%, #1a1040 100%)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 40px #6366f155" }}>
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Texto */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Recurso bloqueado
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          {recurso
            ? <><span className="text-indigo-400 font-medium">{recurso}</span> não está disponível no seu plano atual.</>
            : "Este recurso não está disponível no seu plano atual."
          }
          {" "}Faça upgrade para desbloquear.
        </p>

        {/* Benefícios rápidos */}
        <div className="space-y-2 mb-6">
          {[
            "Questões, flashcards e simulados ilimitados",
            "Mentores IA especializados por área",
            "Biblioteca de PDFs por tópico",
            "Questões adaptativas com IA",
          ].map(b => (
            <div key={b} className="flex items-center gap-2 text-sm text-gray-300">
              <Zap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              {b}
            </div>
          ))}
        </div>

        {/* Botões */}
        <button
          onClick={() => { onClose(); router.push("/planos"); }}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95 mb-2"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px #6366f155" }}
        >
          Ver planos e fazer upgrade
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
