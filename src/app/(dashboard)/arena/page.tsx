import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { ArenaLobby } from "./arena-client";

export default async function ArenaPage() {
  const { hasArena } = await getAccessLevel();
  if (!hasArena) {
    return (
      <UpgradeUI
        recurso="Arena de Competição"
        desc="Compita com outros candidatos em tempo real, suba no ranking e teste seus conhecimentos. Disponível no plano Aprovação ou superior."
        icon="⚔️"
      />
    );
  }
  return <ArenaLobby />;
}
