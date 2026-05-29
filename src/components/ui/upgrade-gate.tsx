"use client";

import { Lock } from "lucide-react";

const PLAN_NAMES: Record<string, string> = {
  focado:   "Focado",
  aprovacao: "Aprovação",
  elite:    "Elite",
};

const PLAN_ORDER = ["trial", "focado", "aprovacao", "elite"];

function planIndex(slug: string | null): number {
  if (!slug) return 0;
  const base = slug.replace("-anual", "");
  return PLAN_ORDER.indexOf(base);
}

interface Props {
  feature: string;
  requiredPlan: "focado" | "aprovacao" | "elite";
  currentPlan: string | null;
  children: React.ReactNode;
}

export function UpgradeGate({ feature, requiredPlan, currentPlan, children }: Props) {
  const hasAccess = planIndex(currentPlan) >= planIndex(requiredPlan);

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred children preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6"
        style={{ background: "rgba(8,12,24,0.85)", backdropFilter: "blur(2px)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))",
            border: "1px solid rgba(99,102,241,0.3)",
          }}>
          <Lock size={22} className="text-indigo-400" />
        </div>

        <div>
          <p className="text-white font-bold text-base mb-1">
            Disponível no plano {PLAN_NAMES[requiredPlan]}
          </p>
          <p className="text-gray-400 text-sm max-w-xs">
            {feature} está disponível a partir do plano {PLAN_NAMES[requiredPlan]}.
            Faça upgrade para continuar.
          </p>
        </div>

        <a
          href="/planos"
          className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            boxShadow: "0 0 20px rgba(99,102,241,0.4)",
          }}
        >
          Ver planos →
        </a>
      </div>
    </div>
  );
}
