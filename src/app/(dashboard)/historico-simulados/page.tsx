import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { HistoricoSimuladosInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Histórico de Simulados" desc="Acompanhe sua evolução nos simulados ao longo do tempo." icon="📈" />;
  return <HistoricoSimuladosInner />;
}
