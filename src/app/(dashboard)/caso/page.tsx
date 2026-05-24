import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan } from "@/lib/db";
import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { CasoClient } from "./caso-client";

export default async function CasoPage() {
  const access = await getAccessLevel();
  if (access.maxCasosPerWeek === 0) {
    return (
      <UpgradeUI
        recurso="Estudo de Caso"
        desc={
          access.planSlug === "trial"
            ? "Casos práticos com avaliação por IA estão disponíveis a partir do plano Focado."
            : "Resolva casos práticos com avaliação detalhada por IA. Disponível nos planos pagos."
        }
        icon="🔍"
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  return <CasoClient />;
}
