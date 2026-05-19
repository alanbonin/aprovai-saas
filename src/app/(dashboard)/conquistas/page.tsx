import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { ConquistasInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Conquistas" desc="Desbloqueie conquistas e badges ao atingir metas." icon="🎖️" />;
  return <ConquistasInner />;
}
