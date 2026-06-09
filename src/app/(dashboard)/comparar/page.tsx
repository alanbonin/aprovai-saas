import { ComingSoonUI } from "@/components/coming-soon-ui";

export default function Page() {
  return (
    <ComingSoonUI
      recurso="Vs. Média"
      icon="📊"
      desc="Veja como você se compara com outros candidatos por matéria, banca e cargo — saiba exatamente onde melhorar."
      features={[
        "Comparativo de acerto por matéria vs. média geral",
        "Desempenho por banca em relação aos outros candidatos",
        "Gráfico de evolução semanal comparada",
        "Identificação das matérias com maior gap",
        "Filtro por cargo e concurso específico",
      ]}
    />
  );
}
