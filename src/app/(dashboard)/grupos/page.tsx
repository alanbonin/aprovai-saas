import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { GruposInner } from "./page-content";

export default async function Page() {
  const access = await getAccessLevel();
  if (!access.hasGroupStudy) {
    return (
      <UpgradeUI
        recurso="Grupos de Estudo"
        desc={
          access.planSlug === "trial" || access.planSlug === "focado"
            ? "Grupos de estudo colaborativos estão disponíveis nos planos Aprovação e Elite."
            : "Participe de grupos de estudo colaborativos. Disponível nos planos Aprovação e Elite."
        }
        icon="👥"
      />
    );
  }
  return <GruposInner />;
}
