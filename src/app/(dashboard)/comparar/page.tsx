import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { CompararInner } from "./page-content";

const PLANS_WITH_ACCESS = ["aprovacao", "aprovacao-anual", "elite", "elite-anual"];

export default async function Page() {
  const { planSlug } = await getAccessLevel();
  const hasAccess = planSlug ? PLANS_WITH_ACCESS.includes(planSlug) : false;
  if (!hasAccess) {
    return (
      <UpgradeUI
        recurso="Comparar com a Média"
        desc="Veja como você se compara com outros candidatos por banca e matéria. Disponível nos planos Aprovação ou Elite."
        icon="📊"
      />
    );
  }
  return <CompararInner />;
}
