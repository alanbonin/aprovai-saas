import { ConfiguracoesClient } from "./configuracoes-client";
import { CONFIG_DEFAULTS } from "@/lib/config-defaults";

export const metadata = { title: "Configurações do Sistema — Admin" };

export default async function ConfiguracoesPage() {
  // Tenta buscar configs customizadas, fallback para os defaults se falhar
  let configs: Record<string, unknown> = { ...(CONFIG_DEFAULTS as Record<string, unknown>) };
  try {
    const { getAllConfigs } = await import("@/lib/system-config");
    configs = await getAllConfigs();
  } catch {
    // usa apenas os defaults
  }
  return <ConfiguracoesClient initialConfigs={configs} />;
}
