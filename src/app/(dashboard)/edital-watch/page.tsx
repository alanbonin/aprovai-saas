import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { EditalWatchInner } from "./page-content";

export default async function Page() {
  const access = await getAccessLevel();
  // Decodificador de edital disponível apenas no plano Elite
  if (!access.hasEditalDecoder) {
    return (
      <UpgradeUI
        recurso="Decodificador de Edital"
        desc="Faça upload do PDF do edital e receba automaticamente um plano de estudos personalizado. Exclusivo do plano Elite."
        icon="📡"
      />
    );
  }
  return <EditalWatchInner />;
}
