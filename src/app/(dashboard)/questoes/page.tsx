import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { QuestoesInner } from "./page-content";

export default async function Page() {
  const access = await getAccessLevel();
  // maxQuestionsPerWeek === 0 = plano expirado/sem plano → bloqueia completamente
  // Trial tem maxQuestionsPerWeek = 200 → passa normalmente
  if (access.maxQuestionsPerWeek === 0) {
    return <UpgradeUI recurso="Banco de Questões" desc="Assine um plano para acessar o banco de questões." icon="📝" />;
  }
  return <QuestoesInner />;
}
