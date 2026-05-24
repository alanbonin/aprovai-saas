-- ══════════════════════════════════════════════════════════════
-- Migration: Plans v2 — novos campos + 4 planos padrão
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Adiciona colunas ao Plan (idempotente)
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "maxQuestionsPerWeek"  INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "maxFlashcardsPerWeek" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "maxSimuladosPerWeek"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxRedacoesPerWeek"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxCasosPerWeek"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hasEditalDecoder"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasPdfLibrary"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasGroupStudy"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasLongTermMemory"    BOOLEAN NOT NULL DEFAULT false;

-- Garante que maxAgents e maxProfiles existem (já devem existir)
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "maxAgents"   INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "maxProfiles" INTEGER NOT NULL DEFAULT 1;

-- 2. Remove planos antigos SEM assinatura vinculada
-- (planos com assinatura ativa ficam por segurança — serão migrados abaixo)
DELETE FROM "Plan"
WHERE id NOT IN (SELECT DISTINCT "planId" FROM "Subscription")
  AND slug NOT IN ('trial','focado','aprovacao','elite');

-- 3. Desativa qualquer plano antigo que ainda tenha assinantes
UPDATE "Plan"
SET active = false
WHERE slug NOT IN ('trial','focado','aprovacao','elite')
  AND id IN (SELECT DISTINCT "planId" FROM "Subscription");

-- 4. Upsert dos 4 planos padrão
-- ── Trial ──────────────────────────────────────────────────────
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "hasEditalDecoder", "hasPdfLibrary", "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Trial Gratuito', 'trial', 0, 7,
  10, 2, 1,
  10, 10,
  0, 0, 0,
  false, false, false, false,
  ARRAY[
    '7 dias grátis sem cartão',
    '2 mentores IA (cargo + banca)',
    '10 mensagens com mentor/semana',
    '10 questões por matéria',
    '10 flashcards com repetição espaçada',
    'Relatório básico de desempenho'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents",
  "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "hasEditalDecoder" = EXCLUDED."hasEditalDecoder",
  "hasPdfLibrary" = EXCLUDED."hasPdfLibrary",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features,
  active = EXCLUDED.active;

-- ── Focado ─────────────────────────────────────────────────────
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "hasEditalDecoder", "hasPdfLibrary", "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Focado', 'focado', 49.90, 30,
  70, 2, 1,
  50, 50,
  2, 2, 2,
  false, false, false, false,
  ARRAY[
    '1 concurso-alvo principal',
    '2 mentores IA (cargo + banca)',
    '70 mensagens com mentor/semana',
    '50 questões por matéria/semana',
    '50 flashcards/semana',
    '2 redações com correção por IA/semana',
    '2 estudos de casos práticos/semana',
    '2 simulados por banca/semana',
    'Cronograma adaptativo semanal',
    'Relatório detalhado de desempenho'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents",
  "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "hasEditalDecoder" = EXCLUDED."hasEditalDecoder",
  "hasPdfLibrary" = EXCLUDED."hasPdfLibrary",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features,
  active = EXCLUDED.active;

-- ── Aprovação ──────────────────────────────────────────────────
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "hasEditalDecoder", "hasPdfLibrary", "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Aprovação', 'aprovacao', 89.90, 30,
  150, 4, 2,
  -1, -1,
  5, 5, 5,
  false, false, true, false,
  ARRAY[
    'Até 2 concursos simultâneos',
    '2 mentores de área + 2 mentores de banca',
    '150 mensagens com mentor/semana',
    'Chat combinado com 2 mentores ao mesmo tempo',
    'Questões ilimitadas por matéria',
    'Flashcards ilimitados',
    '5 redações e casos práticos/semana',
    '5 simulados por banca/semana',
    'Cronograma adaptativo semanal',
    'Relatório completo + gráficos de evolução',
    'Grupos de estudo online'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents",
  "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "hasEditalDecoder" = EXCLUDED."hasEditalDecoder",
  "hasPdfLibrary" = EXCLUDED."hasPdfLibrary",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features,
  active = EXCLUDED.active;

-- ── Elite ──────────────────────────────────────────────────────
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "hasEditalDecoder", "hasPdfLibrary", "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Elite', 'elite', 149.90, 30,
  -1, 8, 4,
  -1, -1,
  -1, -1, -1,
  true, true, true, true,
  ARRAY[
    'Até 4 concursos simultâneos',
    'Até 8 mentores IA simultâneos (4 área + 4 banca)',
    'Mensagens ilimitadas com mentor',
    'Chat combinado com múltiplos mentores',
    'Questões, flashcards e simulados ilimitados',
    'Redação, casos práticos e dissertações ilimitados',
    'Decodificador de edital (PDF → plano de estudos)',
    'Biblioteca de PDFs + chat com documentos',
    'Modo Companhia — grupos de estudo online',
    'Cronograma adaptativo com IA avançada',
    'Memória de longo prazo do mentor',
    'Suporte prioritário'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents",
  "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "hasEditalDecoder" = EXCLUDED."hasEditalDecoder",
  "hasPdfLibrary" = EXCLUDED."hasPdfLibrary",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features,
  active = EXCLUDED.active;

-- 5. Verificação
SELECT slug, name, price, "maxAgents", "maxProfiles",
       "aiCreditsPerWeek", "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
       "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
       "hasEditalDecoder", "hasGroupStudy", active
FROM "Plan"
ORDER BY price;
