import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { QuestoesInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Banco de Questões" desc="Acesse todo o banco de questões por matéria e banca. Disponível nos planos pagos." icon="📝" />;
  return <QuestoesInner />;
}
