"use client";
import { useState } from "react";
import { Check, Zap, Star, Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./checkout-button";

interface Plan {
  id: string; name: string; slug: string;
  price: number; priceMonthly: number;
  billingCycle: string; intervalDays: number;
  aiCreditsPerWeek: number; maxAgents: number;
  features: string[]; active: boolean;
}

interface Props {
  plans: Plan[];
  currentPlanId: string | null;
}

const SLUG_CONFIG: Record<string, { icon: typeof Zap; color: string; tagline: string; highlight: string }> = {
  "focado":      { icon: Zap,    color: "indigo",  tagline: "1 concurso, foco total",          highlight: "" },
  "aprovacao":   { icon: Star,   color: "orange",  tagline: "Até 2 trilhas simultâneas",        highlight: "Mais popular" },
  "elite":       { icon: Trophy, color: "purple",  tagline: "Sem limites, ponto.",              highlight: "Melhor custo-benefício" },
};

function getBaseSlug(slug: string) {
  return slug.replace(/-mensal$|-anual$/, "");
}

export function PlanosClient({ plans, currentPlanId }: Props) {
  const [isAnual, setIsAnual] = useState(true);

  const cycle = isAnual ? "ANNUAL" : "MONTHLY";

  // Planos recorrentes filtrados pelo ciclo selecionado
  const recorrentes = plans.filter(p =>
    p.billingCycle === cycle &&
    p.slug !== "prova-marcada"
  );

  // Plano único (sempre mostrado)
  const provaMarcada = plans.find(p => p.slug === "prova-marcada");

  // Plano mensal equivalente para calcular economia
  const mensais = plans.filter(p => p.billingCycle === "MONTHLY");

  function getEconomia(plan: Plan) {
    if (plan.billingCycle !== "ANNUAL") return 0;
    const base = getBaseSlug(plan.slug);
    const mensal = mensais.find(p => getBaseSlug(p.slug) === base);
    if (!mensal) return 0;
    return (mensal.price * 12) - plan.price;
  }

  return (
    <div className="min-h-screen text-white p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-gray-400 mb-6">
          Todos os planos incluem workspace personalizado, matérias, questões e flashcards.
        </p>

        {/* Toggle mensal/anual */}
        <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setIsAnual(false)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-all",
              !isAnual ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnual(true)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              isAnual ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"
            )}
          >
            Anual
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-semibold",
              isAnual ? "bg-green-500 text-white" : "bg-green-500/20 text-green-400"
            )}>
              até 34% off
            </span>
          </button>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {recorrentes.map(plan => {
          const base = getBaseSlug(plan.slug);
          const config = SLUG_CONFIG[base];
          const Icon = config?.icon ?? Zap;
          const isPopular = base === "aprovacao";
          const isCurrent = plan.id === currentPlanId;
          const economia = getEconomia(plan);
          const agentLabel = plan.maxAgents >= 999
            ? "Agentes ilimitados"
            : `${plan.maxAgents} agentes`;
          const msgLabel = plan.aiCreditsPerWeek >= 9999
            ? "Mensagens ilimitadas"
            : `${plan.aiCreditsPerWeek} mensagens/semana`;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border flex flex-col p-6 transition-all",
                isPopular
                  ? "border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/10"
                  : "border-white/10 bg-white/3"
              )}
            >
              {config?.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap",
                    isPopular ? "bg-orange-500 text-white" : "bg-purple-600 text-white"
                  )}>
                    <Icon className="w-3 h-3" />
                    {config.highlight}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold mb-0.5">{plan.name}</h2>
                <p className="text-xs text-gray-500 mb-5">{config?.tagline}</p>

                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-4xl font-black">
                    R$ {plan.priceMonthly.toFixed(0)}
                  </span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                {isAnual && (
                  <p className="text-xs text-gray-600">
                    R$ {plan.price.toFixed(0)} cobrado anualmente
                  </p>
                )}
                {isAnual && economia > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full">
                    <Check className="w-3 h-3" />
                    Economize R$ {economia.toFixed(0)}/ano
                  </div>
                )}
              </div>

              {/* Destaque agentes + mensagens */}
              <div className={cn(
                "rounded-xl p-3 mb-5 text-center border",
                isPopular
                  ? "bg-orange-500/10 border-orange-500/20"
                  : "bg-indigo-600/10 border-indigo-500/20"
              )}>
                <p className={cn("text-sm font-semibold", isPopular ? "text-orange-400" : "text-indigo-400")}>
                  {agentLabel}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{msgLabel}</p>
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
                <CheckoutButton planId={plan.id} planName={plan.name} isPopular={isPopular} />
              )}
            </div>
          );
        })}
      </div>

      {/* Prova Marcada — seção separada */}
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
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  2 agentes (1 cargo + 1 banca)
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  60 mensagens/semana
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  12 meses de acesso
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  Sem renovação automática
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="text-center md:text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">R$ {provaMarcada.price.toFixed(0)}</span>
                  <span className="text-gray-500 text-sm">à vista</span>
                </div>
                <p className="text-xs text-green-400 font-medium">
                  ≈ R$ {(provaMarcada.price / 12).toFixed(0)}/mês — o mais barato de todos
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
