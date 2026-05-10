import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Check, Zap, Star } from "lucide-react";
import { CheckoutButton } from "./checkout-button";

function formatPrice(price: number, slug: string) {
  if (slug === "foco-total") return { value: "R$ 197", suffix: "à vista", sub: "acesso de 6 meses" };
  return { value: `R$ ${price.toFixed(0)}`, suffix: "/mês", sub: "cobrado mensalmente" };
}

export default async function PlanosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const { data: plans } = await db.from("Plan").select("*").eq("active", true).order("price");
  const currentPlanId = dbUser.subscription?.planId;

  const highlights: Record<string, string> = {
    basico: "",
    pro: "Mais popular",
    elite: "Melhor custo-benefício",
    "foco-total": "Compra única",
  };

  return (
    <div className="p-8 text-white max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-gray-400">Cada plano dá acesso a um número diferente de mentores IA especializados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {(plans ?? []).map((plan) => {
          const isPopular = plan.slug === "pro";
          const isCurrent = plan.id === currentPlanId;
          const highlight = highlights[plan.slug];
          const pricing = formatPrice(plan.price, plan.slug);
          const agentLabel = plan.maxAgents >= 999 ? "Agentes ilimitados" : `${plan.maxAgents} agente${plan.maxAgents > 1 ? "s" : ""} especialista${plan.maxAgents > 1 ? "s" : ""}`;

          return (
            <div key={plan.id} className={`relative rounded-2xl border flex flex-col p-6 ${
              isPopular ? "border-orange-500 bg-orange-500/5" : "border-white/10 bg-white/3"
            }`}>
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                    isPopular ? "bg-orange-500 text-white" : "bg-indigo-600 text-white"
                  }`}>
                    {isPopular ? <Zap className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                    {highlight}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold mb-0.5">{plan.name}</h2>
                <p className="text-xs text-gray-500 mb-4">
                  {plan.slug === "basico" && "Pra quem está começando focado."}
                  {plan.slug === "pro" && "Pra quem está estudando pra mais de um concurso."}
                  {plan.slug === "elite" && "Pra concurseiro de carreira sem concessões."}
                  {plan.slug === "foco-total" && "Compra única — pra quem tem um concurso específico marcado."}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">{pricing.value}</span>
                  <span className="text-gray-500 text-sm">{pricing.suffix}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{pricing.sub}</p>
              </div>

              {/* Destaque de agentes */}
              <div className={`rounded-xl p-3 mb-5 text-sm font-medium text-center ${
                isPopular ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
              }`}>
                {agentLabel}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature: string) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2.5 rounded-lg border border-green-500/30 text-green-400 text-sm text-center font-medium">
                  Plano atual ✓
                </div>
              ) : (
                <CheckoutButton planId={plan.id} planName={plan.name} isPopular={isPopular} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-gray-600 text-sm mt-8">
        Cancele a qualquer momento. Sem multa. Sem burocracia.
      </p>
    </div>
  );
}
