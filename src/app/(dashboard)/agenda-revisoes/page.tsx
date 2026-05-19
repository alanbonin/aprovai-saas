import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { AgendaRevisoesInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Agenda de Revisões" desc="Cronograma inteligente de revisões por matéria. Disponível nos planos pagos." icon="📆" />;
  return <AgendaRevisoesInner />;
}
