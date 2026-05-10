import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { CheckoutButton } from "./checkout-button";
import { formatCurrency } from "@/lib/utils";

export default async function PlanosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { subscription: { include: { plan: true } } },
  });
  if (!dbUser) redirect("/login");

  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });

  const currentPlanId = dbUser.subscription?.planId;

  return (
    <div className="p-8 text-white max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Escolha seu plano</h1>
        <p className="text-gray-400">Invista na sua aprovação. Cancele quando quiser.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => {
          const isPopular = i === 1;
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                isPopular
                  ? "border-indigo-500 bg-indigo-600/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Mais popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {plan.aiCreditsPerWeek === 999 ? "Mentoria IA ilimitada" : `${plan.aiCreditsPerWeek} perguntas de IA por semana`}
                </li>
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
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
    </div>
  );
}
