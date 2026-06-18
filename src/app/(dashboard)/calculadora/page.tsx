import { ComingSoonUI } from "@/components/coming-soon-ui";

export default function Page() {
  return (
    <ComingSoonUI
      recurso="Calculadora"
      icon="🧮"
      desc="Simule cenários e descubra quantos acertos você precisa para ser aprovado no seu concurso."
      features={[
        "Cálculo de nota de corte por banca",
        "Simulação por matéria e peso",
        "Comparativo com candidatos aprovados",
        "Estimativa de aprovação personalizada",
        "Histórico de simulações salvas",
      ]}
    />
  );
}
