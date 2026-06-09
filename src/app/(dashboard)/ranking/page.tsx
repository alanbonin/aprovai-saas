import { ComingSoonUI } from "@/components/coming-soon-ui";

export default function Page() {
  return (
    <ComingSoonUI
      recurso="Ranking"
      icon="🏆"
      desc="Compete com outros candidatos, suba no ranking e acompanhe sua evolução em relação a outros concurseiros."
      features={[
        "Ranking geral e por cargo/matéria",
        "Posição semanal e histórico de evolução",
        "Comparativo com candidatos do mesmo concurso",
        "Conquistas e medalhas por desempenho",
        "Liga de competição entre amigos",
      ]}
    />
  );
}
