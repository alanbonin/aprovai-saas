import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { AdaptativoInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Modo Adaptativo" desc="Questões que se adaptam ao seu nível de acerto em tempo real. Disponível nos planos pagos." icon="🧠" />;
  return <AdaptativoInner />;
}
