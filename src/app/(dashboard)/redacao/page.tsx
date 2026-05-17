import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";
import { PremiumGate } from "@/components/ui/premium-gate";
import { RedacaoClient } from "./redacao-client";

export default async function RedacaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const isPremium = !!(dbUser.subscription && dbUser.subscription.status === "ACTIVE" && (dbUser.subscription.plan?.price ?? 0) > 0);

  if (!isPremium) {
    return (
      <div className="p-8">
        <PremiumGate
          recurso="Redação Oficial com IA"
          descricao="Treine redações oficiais e receba correção detalhada com IA especializada em concursos. Disponível a partir do plano Focado."
        />
      </div>
    );
  }

  return <RedacaoClient />;
}
