import { db } from "@/lib/db";
import { Check } from "lucide-react";

export default async function PlanosAdminPage() {
  const { data: plans } = await db.from("Plan").select("*").order("price");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-gray-500 text-sm mt-1">Configure os planos disponíveis na plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(plans ?? []).map((plan: {
          id: string; name: string; slug: string; price: number;
          maxAgents: number; aiCreditsPerWeek: number; features: string[]; active: boolean
        }) => (
          <div key={plan.id} className="rounded-xl border border-white/5 bg-white/3 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-xs text-gray-500">{plan.slug}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">R$ {plan.price.toFixed(0)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${plan.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {plan.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>{plan.maxAgents >= 999 ? "∞" : plan.maxAgents} mentor{plan.maxAgents !== 1 ? "es" : ""}</span>
              <span>{plan.aiCreditsPerWeek} msgs/semana</span>
            </div>
            <ul className="space-y-1">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
