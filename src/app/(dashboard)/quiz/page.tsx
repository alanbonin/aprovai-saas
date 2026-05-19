import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { QuizInner } from "./page-content";

export default async function Page() {
  const { isPremium } = await getAccessLevel();
  if (!isPremium) return <UpgradeUI recurso="Quiz Rápido" desc="Teste seu conhecimento com quizzes cronometrados. Disponível nos planos pagos." icon="🏃" />;
  return <QuizInner />;
}
