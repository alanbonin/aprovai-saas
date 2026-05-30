import { db } from "@/lib/db";
// Re-exporta tipos e defaults de config-defaults (sem db — seguro para client components)
export { CONFIG_DEFAULTS, type ConfigKey, type ConfigValue } from "@/lib/config-defaults";
import { CONFIG_DEFAULTS, type ConfigKey, type ConfigValue } from "@/lib/config-defaults";

const CONFIG_PREFIX = "__CONFIG__:";

/** Busca uma configuração do banco (com fallback para o default) */
export async function getConfig<K extends ConfigKey>(key: K): Promise<typeof CONFIG_DEFAULTS[K]> {
  try {
    const { data } = await db
      .from("Note")
      .select("content")
      .eq("subjectId", `${CONFIG_PREFIX}${key}`)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.content) {
      return JSON.parse(data.content) as typeof CONFIG_DEFAULTS[K];
    }
  } catch { /* usa default */ }
  return CONFIG_DEFAULTS[key];
}

/** Busca múltiplas configs de uma vez */
export async function getConfigs<K extends ConfigKey>(keys: K[]): Promise<Record<K, typeof CONFIG_DEFAULTS[K]>> {
  const prefixedKeys = keys.map(k => `${CONFIG_PREFIX}${k}`);
  const { data } = await db
    .from("Note")
    .select("subjectId, content")
    .in("subjectId", prefixedKeys);

  const result = {} as Record<K, typeof CONFIG_DEFAULTS[K]>;
  for (const key of keys) {
    const row = data?.find(r => r.subjectId === `${CONFIG_PREFIX}${key}`);
    result[key] = row?.content ? JSON.parse(row.content) : CONFIG_DEFAULTS[key];
  }
  return result;
}

/** Busca TODAS as configs (para o painel admin) */
export async function getAllConfigs(): Promise<Record<string, ConfigValue>> {
  const { data } = await db
    .from("Note")
    .select("subjectId, content")
    .like("subjectId", `${CONFIG_PREFIX}%`);

  const result: Record<string, ConfigValue> = { ...(CONFIG_DEFAULTS as Record<string, ConfigValue>) };
  for (const row of data ?? []) {
    const key = (row.subjectId as string).replace(CONFIG_PREFIX, "");
    if (key in CONFIG_DEFAULTS && row.content) {
      try { result[key] = JSON.parse(row.content); } catch { /* ignora */ }
    }
  }
  return result;
}

/** Salva uma configuração no banco (adminUserId = ID do admin logado) */
export async function setConfig(key: string, value: ConfigValue, adminUserId: string): Promise<void> {
  const subjectId = `${CONFIG_PREFIX}${key}`;
  const content = JSON.stringify(value);

  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("subjectId", subjectId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() })
      .eq("id", (existing as { id: string }).id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      subjectId,
      content,
      userId: adminUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Remove uma config do banco (restaura para o default) */
export async function deleteConfig(key: string): Promise<void> {
  await db
    .from("Note")
    .delete()
    .eq("subjectId", `${CONFIG_PREFIX}${key}`);
}
