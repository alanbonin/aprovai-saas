import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { QuestoesInner } from "./page-content";

export default async function Page() {
  const access = await getAccessLevel();
  // Trial (price=0) tem acesso limitado; expirado/sem plano é bloqueado
  if (access.maxQuestionsPerWeek === 0 && !access.isPremium && !access.planSlug) {
    return <UpgradeUI recurso="Banco de Questões" desc="Faça o Trial gratuito ou assine um plano para acessar o banco de questões." icon="📝" />;
  }
  return <QuestoesInner />;
}
