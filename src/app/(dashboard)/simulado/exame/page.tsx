import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { SimuladoExameInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Modo Exame" desc="Simulado em modo exame sem gabarito imediato. Disponível nos planos pagos." icon="⏱️" />;
  return <SimuladoExameInner />;
}
