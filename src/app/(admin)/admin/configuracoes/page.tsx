import { getAllConfigs } from "@/lib/system-config";
import { ConfiguracoesClient } from "./configuracoes-client";

export const metadata = { title: "Configurações do Sistema — Admin" };

export default async function ConfiguracoesPage() {
  const configs = await getAllConfigs();
  return <ConfiguracoesClient initialConfigs={configs} />;
}
