-- ══════════════════════════════════════════════════════════════
-- Migration: Plans v4 — novos campos booleanos de feature flags
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eyurnrzzznlqnhltjhwg/sql
-- ══════════════════════════════════════════════════════════════

-- Adiciona colunas de feature flag (idempotente)
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "hasPdfLibrary" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasArena"      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasAdaptativo" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasCompanhia"  boolean NOT NULL DEFAULT false;

-- Confirma resultado
SELECT slug, "hasPdfLibrary", "hasArena", "hasAdaptativo", "hasCompanhia"
FROM "Plan"
ORDER BY price;
