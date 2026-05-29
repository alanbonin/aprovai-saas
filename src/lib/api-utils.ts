/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AprovAI360 — Utilitários para API Routes                   ║
 * ║                                                              ║
 * ║  Funções compartilhadas para autenticação, resposta          ║
 * ║  de erro segura e validação de cron.                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

// ── Resposta de erro segura (nunca expõe detalhes internos) ───────────────────
export function errResponse(
  status: number,
  publicMsg: string,
  err?: unknown,
  logEvent?: string,
  logDetails?: Record<string, unknown>
): NextResponse {
  if (err && logEvent) {
    log.error(logEvent, logDetails, err);
  }
  return NextResponse.json({ error: publicMsg }, { status });
}

// ── Verificação de autenticação de cron/email internos ────────────────────────
/**
 * Retorna true se a requisição está autorizada.
 * - Em produção: exige Bearer <CRON_SECRET>
 * - Em dev: sem secret configurado → permite (facilita desenvolvimento local)
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Extrai IP do cliente de forma segura ──────────────────────────────────────
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ── Resposta 401 padronizada ──────────────────────────────────────────────────
export const UNAUTHORIZED = NextResponse.json(
  { error: "Não autorizado" },
  { status: 401 }
);

// ── Contagem semanal de uso de um recurso ─────────────────────────────────────
// Conta quantas vezes o usuário usou um recurso na semana atual
// Usa a tabela Progress ou AiUsage dependendo do contexto
// Para recursos como caso/redação, contamos via tabela WeeklyUsage
import { db } from "@/lib/db";

export function getWeekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export async function getWeeklyResourceUsage(userId: string, resource: string): Promise<number> {
  const weekStart = getWeekStartStr();
  const { data } = await db
    .from("WeeklyUsage")
    .select("count")
    .eq("userId", userId)
    .eq("resource", resource)
    .eq("weekStart", weekStart)
    .maybeSingle();
  return (data as { count: number } | null)?.count ?? 0;
}

export async function incrementWeeklyResourceUsage(userId: string, resource: string): Promise<void> {
  const weekStart = getWeekStartStr();
  const { data: existing } = await db
    .from("WeeklyUsage")
    .select("id, count")
    .eq("userId", userId)
    .eq("resource", resource)
    .eq("weekStart", weekStart)
    .maybeSingle();

  if (existing) {
    await db.from("WeeklyUsage")
      .update({ count: (existing as { id: string; count: number }).count + 1 })
      .eq("id", (existing as { id: string }).id);
  } else {
    await db.from("WeeklyUsage").insert({
      id: crypto.randomUUID(),
      userId,
      resource,
      weekStart,
      count: 1,
    });
  }
}
