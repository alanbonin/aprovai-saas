import { ComingSoonUI } from "@/components/coming-soon-ui";

export default function ArenaPage() {
  return (
    <ComingSoonUI
      recurso="Arena de Competição"
      icon="⚔️"
      desc="Compita com outros candidatos em tempo real, teste seus conhecimentos e prove que está pronto para a aprovação."
      features={[
        "Duelos em tempo real contra outros candidatos",
        "Salas temáticas por cargo e matéria",
        "Sistema de pontuação e ligas",
        "Torneios semanais com premiação",
        "Ranking ao vivo durante as partidas",
      ]}
    />
  );
}
