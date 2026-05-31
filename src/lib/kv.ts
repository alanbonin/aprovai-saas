/**
 * KV helper centralizado — usa a tabela Note com subjectId como chave.
 *
 * Padrão de prefixos usados no sistema:
 *   "__FAV_Q__"              — Favoritos de questões
 *   "__CADERNO_APRENDIDO__"  — Questões marcadas como aprendidas
 *   "__DESAFIO__"            — Resultado do desafio diário
 *   "__BADGES__"             — Badges conquistados
 *   "__MENTOR_MEM__"         — Memória do mentor IA
 *   "__WEBHOOK_LOG__"        — Logs do webhook de pagamento
 */

import { db } from "@/lib/db";

/**
 * Lê um valor JSON do KV store.
 * Retorna `undefined` se a chave não existir ou o JSON for inválido.
 */
export async function kvGet<T = unknown>(userId: string, key: string): Promise<T | undefined> {
  const { data } = await db
    .from("Note")
    .select("content")
    .eq("userId", userId)
    .eq("subjectId", key)
    .maybeSingle();

  if (!data?.content) return undefined;
  try {
    return JSON.parse(data.content) as T;
  } catch {
    return undefined;
  }
}

/**
 * Grava (upsert) um valor JSON no KV store.
 */
export async function kvSet<T = unknown>(userId: string, key: string, value: T): Promise<void> {
  const content = JSON.stringify(value);
  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("userId", userId)
    .eq("subjectId", key)
    .maybeSingle();

  if (existing?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId,
      subjectId: key,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Remove uma chave do KV store.
 */
export async function kvDelete(userId: string, key: string): Promise<void> {
  await db.from("Note").delete().eq("userId", userId).eq("subjectId", key);
}
