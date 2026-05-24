import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { SimuladoClient } from "./simulado-client";
import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";

export default async function SimuladoPage() {
  const access = await getAccessLevel();
  // Trial (maxSimuladosPerWeek=0) e expirados são bloqueados
  if (access.maxSimuladosPerWeek === 0) {
    return (
      <UpgradeUI
        recurso="Simulados"
        desc={
          access.planSlug === "trial"
            ? "Simulados estão disponíveis a partir do plano Focado. Faça upgrade para praticar com bancas reais."
            : "Simulados completos com gabarito comentado e análise de desempenho. Disponível nos planos pagos."
        }
        icon="🎯"
      />
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const [historyRes, profileRes] = await Promise.all([
    db.from("SimuladoHistory")
      .select("id, total, correct, timeSecs, createdAt")
      .eq("userId", dbUser.id)
      .order("createdAt", { ascending: false })
      .limit(20),
    db.from("StudentProfile")
      .select("modalidade")
      .eq("userId", dbUser.id)
      .maybeSingle(),
  ]);

  const modalidade = (profileRes.data as { modalidade?: string } | null)?.modalidade ?? "CONCURSO_PUBLICO";

  return (
    <SimuladoClient
      history={historyRes.data ?? []}
      userId={dbUser.id}
      modalidade={modalidade}
    />
  );
}
