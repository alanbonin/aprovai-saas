import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { SimuladoRevisaoInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Simulado de Revisão" desc="Simulado baseado em questões que você errou. Disponível nos planos pagos." icon="🔁" />;
  return <SimuladoRevisaoInner />;
}
