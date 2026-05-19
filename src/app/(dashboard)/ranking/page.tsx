import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { RankingInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Ranking" desc="Compete com outros candidatos e suba no ranking." icon="🏆" />;
  return <RankingInner />;
}
