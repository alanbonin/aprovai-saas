import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { TimelineInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Linha do Tempo" desc="Acompanhe sua jornada de estudos ao longo do tempo." icon="🕐" />;
  return <TimelineInner />;
}
