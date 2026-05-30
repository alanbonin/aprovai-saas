import { ConfiguracoesClient } from "./configuracoes-client";
import { getAllConfigs } from "@/lib/system-config";

export const metadata = { title: "Configurações do Sistema — Admin" };

export default async function ConfiguracoesPage() {
  const configs = await getAllConfigs();
  return <ConfiguracoesClient initialConfigs={configs} />;
}
