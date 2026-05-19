import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { SimuladoFiltradoInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Simulados com Filtros" desc="Simulados com filtros por matéria e banca. Disponível nos planos pagos." icon="🎛️" />;
  return <SimuladoFiltradoInner />;
}
