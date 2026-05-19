import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { DiagnosticoInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Diagnóstico" desc="Análise profunda dos seus pontos fortes e fracos por matéria. Disponível nos planos pagos." icon="🩺" />;
  return <DiagnosticoInner />;
}
