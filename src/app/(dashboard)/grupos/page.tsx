import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { GruposInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Grupos de Estudo" desc="Participe de grupos de estudo colaborativos." icon="👥" />;
  return <GruposInner />;
}
