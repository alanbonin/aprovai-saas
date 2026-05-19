import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { NivelInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Análise por Nível" desc="Breakdown do seu desempenho por nível de dificuldade. Disponível nos planos pagos." icon="📶" />;
  return <NivelInner />;
}
