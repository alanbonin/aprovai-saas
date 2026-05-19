import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { ArtigosInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Artigos IA" desc="Artigos de lei comentados com IA para facilitar a compreensão. Disponível nos planos pagos." icon="📜" />;
  return <ArtigosInner />;
}
