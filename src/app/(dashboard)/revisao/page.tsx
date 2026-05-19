import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { RevisaoInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Revisão SM-2" desc="Revisão espaçada inteligente baseada no algoritmo SuperMemo 2. Disponível nos planos pagos." icon="🔄" />;
  return <RevisaoInner />;
}
