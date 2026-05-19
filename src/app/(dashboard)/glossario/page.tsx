import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { GlossarioInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Glossário IA" desc="Glossário jurídico e técnico explicado pela IA. Disponível nos planos pagos." icon="📖" />;
  return <GlossarioInner />;
}
