import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { DesafioSemanalInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Desafio Semanal" desc="Desafios semanais com ranking e premiação. Disponível nos planos pagos." icon="⚔️" />;
  return <DesafioSemanalInner />;
}
