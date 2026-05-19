import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { PlanoSemanalInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Plano IA" desc="Plano de estudos gerado e ajustado por IA semanalmente. Disponível nos planos pagos." icon="🤖" />;
  return <PlanoSemanalInner />;
}
