import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { MateriaisInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Materiais" desc="Acesse PDFs, vídeos e materiais de estudo completos. Disponível nos planos pagos." icon="📄" />;
  return <MateriaisInner />;
}
