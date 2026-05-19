import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { FavoritosInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Favoritos" desc="Salve e revise suas questões favoritas. Disponível nos planos pagos." icon="⭐" />;
  return <FavoritosInner />;
}
