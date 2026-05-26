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
