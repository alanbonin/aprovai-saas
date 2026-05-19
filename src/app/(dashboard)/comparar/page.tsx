import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { CompararInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Comparar com a Média" desc="Veja como você se compara com outros candidatos. Disponível nos planos pagos." icon="📊" />;
  return <CompararInner />;
}
