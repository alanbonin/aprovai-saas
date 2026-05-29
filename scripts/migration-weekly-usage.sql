-- Migration: WeeklyUsage — controle de uso semanal por recurso
-- Executa no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "WeeklyUsage" (
  "id"        text PRIMARY KEY,
  "userId"    text NOT NULL,
  "resource"  text NOT NULL,  -- 'caso', 'redacao', 'simulado', etc.
  "weekStart" text NOT NULL,  -- YYYY-MM-DD (segunda-feira da semana)
  "count"     integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", "resource", "weekStart")
);

CREATE INDEX IF NOT EXISTS "WeeklyUsage_userId_idx" ON "WeeklyUsage" ("userId");
CREATE INDEX IF NOT EXISTS "WeeklyUsage_weekStart_idx" ON "WeeklyUsage" ("weekStart");

-- Limpa registros com mais de 60 dias (manutenção)
-- (rodar via cron semanal)
-- DELETE FROM "WeeklyUsage" WHERE "weekStart" < (NOW() - INTERVAL '60 days')::date::text;
