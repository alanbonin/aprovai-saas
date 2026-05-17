"use client";
import { Check, Zap, Star, Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./checkout-button";

interface Plan {
  id: string; name: string; slug: string;
  price: number; intervalDays: number;
  aiCreditsPerWeek: number;
  features: string[]; active: boolean;
}

interface Props {
  plans: Plan[];
  currentPlanId: string | null;
}

const SLUG_CONFIG: Record<string, { icon: typeof Zap; tagline: string; highlight: string; popular: boolean }> = {
  "focado":        { icon: Zap,    tagline: "1 concurso, foco total",       highlight: "",                    popular: false },
  "aprovacao":     { icon: Star,   tagline: "Até 2 trilhas simultâneas",    highlight: "Mais popular",        popular: true  },
  "elite":         { icon: Trophy, tagline: "Sem limites, ponto.",           highlight: "Melhor custo-benefício", popular: false },
  "prova-marcada": { icon: Lock,   tagline: "Pagamento único, 12 meses",    highlight: "",                    popular: false },
};

function isOneTime(plan: Plan) {
  return plan.intervalDays >= 365 || plan.slug === "prova-marcada";
}

export function PlanosClient({ plans, currentPlanId }: Props) {
  const recorrentes = plans.filter(p => !isOneTime(p));
  const provaMarcada = plans.find(isOneTime);

  return (
    <div className="min-h-screen text-white p-8 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-gray-400">
          Todos os planos incluem workspace personalizado, matérias, questões e flashcards.
        </p>
      </div>

      {/* Cards principais */}
      <div className={cn(
        "grid grid-cols-1 gap-5 mb-8",
        recorrentes.length === 2 ? "md:grid-cols-2" :
        recorrentes.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
      )}>
        {recorrentes.map(plan => {
          const config = SLUG_CONFIG[plan.slug] ?? SLUG_CONFIG["focado"];
          const Icon = config.icon;
          const isCurrent = plan.id === currentPlanId;
          const priceMonth = plan.intervalDays > 0
            ? (plan.price / (plan.intervalDays / 30)).toFixed(0)
            : plan.price.toFixed(0);

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border flex flex-col p-6 transition-all",
                config.popular
                  ? "border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/10"
                  : "border-white/10 bg-white/3"
              )}
            >
              {config.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap",
                    config.popular ? "bg-orange-500 text-white" : "bg-purple-600 text-white"
                  )}>
                    <Icon className="w-3 h-3" />
                    {config.highlight}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold mb-0.5">{plan.name}</h2>
                <p className="text-xs text-gray-500 mb-5">{config.tagline}</p>

                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-4xl font-black">R$ {priceMonth}</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                {plan.intervalDays > 30 && (
                  <p className="text-xs text-gray-600">
                    R$ {plan.price.toFixed(0)} cobrado a cada {Math.round(plan.intervalDays / 30)} meses
                  </p>
                )}
              </div>

              <div className={cn(
                "rounded-xl p-3 mb-5 text-center border",
                config.popular
                  ? "bg-orange-500/10 border-orange-500/20"
                  : "bg-indigo-600/10 border-indigo-500/20"
              )}>
                <p className={cn("text-sm font-semibold", config.popular ? "text-orange-400" : "text-indigo-400")}>
                  {plan.aiCreditsPerWeek >= 9999 ? "Mensagens ilimitadas" : `${plan.aiCreditsPerWeek} mensagens/semana`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">com seu mentor IA</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2.5 rounded-xl border border-green-500/30 text-green-400 text-sm text-center font-medium">
                  Plano atual ✓
                </div>
              ) : (
                <CheckoutButton planId={plan.id} planName={plan.name} isPopular={config.popular} isFree={plan.price === 0} />
              )}
            </div>
          );
        })}
      </div>

      {/* Prova Marcada */}
      {provaMarcada && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-yellow-400" />
                <h3 className="font-bold text-lg">{provaMarcada.name}</h3>
                <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                  Pagamento único
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Edital saiu e você precisa focar agora. Pague uma vez, estude por 12 meses. Sem renovação automática.
              </p>
              <ul className="flex flex-wrap gap-3 text-xs text-gray-500">
                {provaMarcada.features.map(f => (
                  <li key={f} className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />{f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="text-center md:text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">R$ {provaMarcada.price.toFixed(0)}</span>
                  <span className="text-gray-500 text-sm">à vista</span>
                </div>
                <p className="text-xs text-green-400 font-medium">
                  ≈ R$ {(provaMarcada.price / 12).toFixed(0)}/mês — sem renovação
                </p>
              </div>
              {provaMarcada.id === currentPlanId ? (
                <div className="px-6 py-2.5 rounded-xl border border-green-500/30 text-green-400 text-sm font-medium">
                  Plano atual ✓
                </div>
              ) : (
                <CheckoutButton planId={provaMarcada.id} planName={provaMarcada.name} isPopular={false} />
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-gray-600 text-xs mt-8">
        Planos recorrentes podem ser cancelados a qualquer momento. Sem multa.
      </p>
    </div>
  );
}
