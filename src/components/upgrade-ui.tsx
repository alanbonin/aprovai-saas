import Link from "next/link";

export function UpgradeUI({ recurso, desc, icon = "🔒" }: { recurso: string; desc: string; icon?: string }) {
  const beneficios = [
    "Simulados completos com gabarito comentado",
    "Flashcards e revisão espaçada SM-2 ilimitados",
    "Questões ilimitadas por dia",
    "Quiz, Desafio Semanal e Modo Adaptativo",
    "Relatórios avançados e diagnóstico por banca",
    "Mentor IA com mensagens ilimitadas",
    "Redação, Casos práticos e muito mais",
  ];
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl"
          style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.3)" }}>
          {icon}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{recurso}</h1>
        <p className="text-gray-400 mb-8">{desc}</p>

        <div className="rounded-2xl p-5 mb-6 text-left space-y-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">O que você desbloqueia:</p>
          {beneficios.map(b => (
            <div key={b} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </div>
              <span className="text-sm text-gray-300">{b}</span>
            </div>
          ))}
        </div>

        <Link href="/planos"
          className="block w-full py-4 rounded-2xl font-bold text-white text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}>
          ⚡ Ver planos e fazer upgrade →
        </Link>
        <p className="text-xs text-gray-600 mt-3">A partir de R$49/mês · Cancele quando quiser</p>
      </div>
    </div>
  );
}
