import { getAccessLevel } from "@/lib/access";
import { UpgradeUI } from "@/components/upgrade-ui";
import { BibliotecaClient } from "./biblioteca-client";

export default async function BibliotecaPage() {
  const { hasPdfLibrary } = await getAccessLevel();
  if (!hasPdfLibrary) {
    return (
      <UpgradeUI
        recurso="Biblioteca de PDFs"
        desc="Acesse apostilas, leis comentadas e materiais exclusivos em PDF com chat integrado. Disponível no plano Aprovação ou superior."
        icon="📚"
      />
    );
  }
  return <BibliotecaClient />;
}
