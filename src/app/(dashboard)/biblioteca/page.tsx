import { ComingSoonUI } from "@/components/coming-soon-ui";

export default function BibliotecaPage() {
  return (
    <ComingSoonUI
      recurso="Biblioteca de PDFs"
      icon="📚"
      desc="Acesse apostilas, leis comentadas e materiais exclusivos em PDF com chat integrado para tirar dúvidas direto no documento."
      features={[
        "Apostilas e materiais por matéria e cargo",
        "Chat com IA integrado ao PDF para tirar dúvidas",
        "Leis comentadas e atualizadas",
        "Marcações e anotações no documento",
        "Acesso offline pelo app",
      ]}
    />
  );
}
