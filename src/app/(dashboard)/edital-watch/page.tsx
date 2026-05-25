import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { EditalWatchInner } from "./page-content";

export default async function Page() {
  const access = await getAccessLevel();
  if (access.maxEditalPerWeek === 0) {
    return (
      <UpgradeUI
        recurso="Decodificador de Edital"
        desc="Faça upload do PDF do edital e receba automaticamente um plano de estudos personalizado. Disponível a partir do plano Trial."
        icon="📡"
      />
    );
  }
  return <EditalWatchInner />;
}
