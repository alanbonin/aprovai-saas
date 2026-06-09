"use client";

interface ComingSoonUIProps {
  recurso: string;
  desc: string;
  icon: string;
  previsao?: string;
  features?: string[];
}

export function ComingSoonUI({ recurso, desc, icon, previsao, features }: ComingSoonUIProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-lg mx-auto text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-6">
        {icon}
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
        🚧 Em implantação
      </div>
      <h1 className="text-2xl font-bold text-white mb-3">{recurso}</h1>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">{desc}</p>
      {features && features.length > 0 && (
        <div className="w-full text-left bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">O que vai ter</p>
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-indigo-400 mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {previsao && (
        <p className="text-xs text-gray-600">Previsão de lançamento: {previsao}</p>
      )}
    </div>
  );
}
