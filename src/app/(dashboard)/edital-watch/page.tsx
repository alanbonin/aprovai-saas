import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { EditalWatchInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Radar de Editais" desc="Monitoramento automático de novos editais. Disponível nos planos pagos." icon="📡" />;
  return <EditalWatchInner />;
}
