import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { BancasInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Análise por Banca" desc="Estatísticas do seu desempenho por banca organizadora. Disponível nos planos pagos." icon="🏛️" />;
  return <BancasInner />;
}
