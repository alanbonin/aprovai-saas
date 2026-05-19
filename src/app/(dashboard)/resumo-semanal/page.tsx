import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { ResumoSemanalInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Resumo Semanal" desc="Relatório semanal detalhado do seu progresso. Disponível nos planos pagos." icon="📋" />;
  return <ResumoSemanalInner />;
}
