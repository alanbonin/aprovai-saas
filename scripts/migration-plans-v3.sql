-- ══════════════════════════════════════════════════════════════
-- Migration: Plans v3 — limites atualizados + edital/PDF como inteiros
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Remove colunas booleanas legadas (substitui por inteiros)
ALTER TABLE "Plan"
  DROP COLUMN IF EXISTS "hasEditalDecoder",
  DROP COLUMN IF EXISTS "hasPdfLibrary";

-- 2. Adiciona novas colunas inteiras (idempotente)
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "maxEditalPerWeek" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxPdfPerWeek"    INTEGER NOT NULL DEFAULT 0;

-- Garante que colunas anteriores existem
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "maxQuestionsPerWeek"  INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "maxFlashcardsPerWeek" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "maxSimuladosPerWeek"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxRedacoesPerWeek"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxCasosPerWeek"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hasGroupStudy"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasLongTermMemory"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxAgents"            INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "maxProfiles"          INTEGER NOT NULL DEFAULT 1;

-- 3. Remove planos antigos sem assinatura vinculada
DELETE FROM "Plan"
WHERE id NOT IN (SELECT DISTINCT "planId" FROM "Subscription")
  AND slug NOT IN ('trial','focado','aprovacao','elite');

-- 4. Desativa planos antigos com assinantes
UPDATE "Plan"
SET active = false
WHERE slug NOT IN ('trial','focado','aprovacao','elite')
  AND id IN (SELECT DISTINCT "planId" FROM "Subscription");

-- ══════════════════════════════════════════════════════════════
-- 5. UPSERT DOS 4 PLANOS
-- ══════════════════════════════════════════════════════════════

-- ── TRIAL GRATUITO ─────────────────────────────────────────────
-- 7 dias | 10 msgs/sem | 10 questões/sem | 10 flashcards/sem
-- 0 simulados | 2 redações | 2 casos | 1 edital | 5 PDFs
-- Grupos: sim | Memória LP: sim
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "maxEditalPerWeek", "maxPdfPerWeek",
  "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Trial Gratuito', 'trial', 0, 7,
  10, 2, 1,
  10, 10,
  0, 2, 2,
  1, 5,
  true, true,
  ARRAY[
    '7 dias grátis sem cartão',
    '2 mentores IA especializados (cargo + banca)',
    '10 mensagens com mentor por semana',
    '10 questões por matéria por semana',
    '10 flashcards com repetição espaçada (SM-2)',
    '2 redações com correção detalhada por IA',
    '2 estudos de casos práticos',
    '1 decodificação de edital (PDF → plano de estudos)',
    '5 documentos na biblioteca de PDFs',
    'Grupos de estudo ilimitados',
    'Memória de longo prazo do mentor',
    'Cronograma adaptativo semanal',
    'Relatório básico de desempenho',
    'Diagnóstico por matéria e banca',
    'Caderno de erros automático',
    'Agenda de revisões espaçadas',
    'Quiz diário e desafio semanal',
    'Ranking e sistema de conquistas',
    'Plano de estudo semanal com IA',
    'Notas e glossário integrados'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents", "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "maxEditalPerWeek" = EXCLUDED."maxEditalPerWeek",
  "maxPdfPerWeek" = EXCLUDED."maxPdfPerWeek",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features, active = EXCLUDED.active;

-- ── FOCADO ────────────────────────────────────────────────────
-- Limites DIÁRIOS (× 7 armazenado como semanal):
-- 20 msgs/dia | 50 questões/dia | 50 flashcards/dia
-- 1 simulado/dia | 1 redação/dia | 1 caso/dia
-- 1 edital/dia | 15 PDFs/dia
-- Grupos: sim | Memória LP: sim
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "maxEditalPerWeek", "maxPdfPerWeek",
  "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Focado', 'focado', 49.90, 30,
  140, 2, 1,
  350, 350,
  7, 7, 7,
  7, 105,
  true, true,
  ARRAY[
    '1 concurso-alvo principal',
    '2 mentores IA especializados (cargo + banca)',
    '20 mensagens com mentor por dia (140/semana)',
    '50 questões por matéria por dia',
    '50 flashcards por dia com repetição espaçada SM-2',
    '1 simulado por banca por dia',
    '1 redação com correção detalhada por IA por dia',
    '1 estudo de caso prático por dia',
    '1 decodificação de edital por dia (PDF → plano)',
    '15 documentos na biblioteca de PDFs por dia',
    'Grupos de estudo ilimitados',
    'Memória de longo prazo do mentor',
    'Cronograma adaptativo semanal com IA',
    'Relatório detalhado de desempenho',
    'Diagnóstico avançado por banca e matéria',
    'Caderno de erros com análise de padrões',
    'Agenda de revisões espaçadas (SM-2)',
    'Plano de estudo semanal personalizado por IA',
    'Quiz diário e desafio semanal',
    'Ranking e sistema de conquistas',
    'Notas, glossário e resumos integrados',
    'Histórico completo de simulados e relatórios'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents", "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "maxEditalPerWeek" = EXCLUDED."maxEditalPerWeek",
  "maxPdfPerWeek" = EXCLUDED."maxPdfPerWeek",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features, active = EXCLUDED.active;

-- ── APROVAÇÃO ─────────────────────────────────────────────────
-- 2 concursos | 4 mentores | 500 msgs/sem (~70/dia)
-- ∞ questões e flashcards | 21 simulados/sem (~3/dia)
-- 21 redações/sem | 21 casos/sem | 21 editais/sem (~3/dia)
-- ∞ PDFs | Grupos: sim | Memória LP: sim
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "maxEditalPerWeek", "maxPdfPerWeek",
  "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Aprovação', 'aprovacao', 89.90, 30,
  500, 4, 2,
  -1, -1,
  21, 21, 21,
  21, -1,
  true, true,
  ARRAY[
    'Até 2 concursos simultâneos',
    '2 mentores de área + 2 mentores de banca',
    '~70 mensagens com mentor por dia (500/semana)',
    'Chat combinado com 2 mentores ao mesmo tempo',
    'Questões ilimitadas por matéria',
    'Flashcards ilimitados com repetição espaçada SM-2',
    '~3 simulados por banca por dia (21/semana)',
    '~3 redações com correção por IA por dia (21/semana)',
    '~3 estudos de casos práticos por dia (21/semana)',
    '~3 decodificações de edital por dia (21/semana)',
    'Biblioteca de PDFs ilimitada',
    'Grupos de estudo ilimitados',
    'Memória de longo prazo do mentor',
    'Cronograma adaptativo com IA avançada',
    'Relatório completo + gráficos de evolução',
    'Diagnóstico avançado por banca, matéria e tópico',
    'Plano semanal personalizado com análise preditiva',
    'Caderno de erros com padrões e recomendações',
    'Agenda de revisões com prioridade inteligente',
    'Quiz diário e desafio semanal com ranking',
    'Histórico completo e análise de tendências',
    'Notas, glossário e resumos integrados'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents", "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "maxEditalPerWeek" = EXCLUDED."maxEditalPerWeek",
  "maxPdfPerWeek" = EXCLUDED."maxPdfPerWeek",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features, active = EXCLUDED.active;

-- ── ELITE ─────────────────────────────────────────────────────
-- Tudo ilimitado | 4 concursos | 8 mentores
INSERT INTO "Plan" (
  id, name, slug, price, "intervalDays",
  "aiCreditsPerWeek", "maxAgents", "maxProfiles",
  "maxQuestionsPerWeek", "maxFlashcardsPerWeek",
  "maxSimuladosPerWeek", "maxRedacoesPerWeek", "maxCasosPerWeek",
  "maxEditalPerWeek", "maxPdfPerWeek",
  "hasGroupStudy", "hasLongTermMemory",
  features, active, "createdAt"
) VALUES (
  gen_random_uuid(), 'Elite', 'elite', 149.90, 30,
  -1, 8, 4,
  -1, -1,
  -1, -1, -1,
  -1, -1,
  true, true,
  ARRAY[
    'Até 4 concursos simultâneos',
    'Até 8 mentores IA simultâneos (4 área + 4 banca)',
    'Mensagens ilimitadas com mentor',
    'Chat combinado com múltiplos mentores ao mesmo tempo',
    'Questões, flashcards e simulados ilimitados',
    'Redações, casos práticos e dissertações ilimitados',
    'Decodificações de edital ilimitadas (PDF → plano)',
    'Biblioteca de PDFs ilimitada + chat com documentos',
    'Grupos de estudo e Modo Companhia ilimitados',
    'Memória de longo prazo avançada do mentor',
    'Cronograma adaptativo com IA de alta performance',
    'Relatório premium + gráficos preditivos de evolução',
    'Diagnóstico completo por banca, matéria e tópico',
    'Plano semanal com análise preditiva de desempenho',
    'Caderno de erros inteligente com padrões de acerto',
    'Agenda de revisões com otimização automática SM-2',
    'Quiz diário, desafio semanal e modo competitivo',
    'Ranking nacional e sistema avançado de conquistas',
    'Histórico completo com análise de tendências por período',
    'Notas, glossário e resumos ilimitados com IA',
    'Suporte prioritário 24h'
  ],
  true, NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price,
  "intervalDays" = EXCLUDED."intervalDays",
  "aiCreditsPerWeek" = EXCLUDED."aiCreditsPerWeek",
  "maxAgents" = EXCLUDED."maxAgents", "maxProfiles" = EXCLUDED."maxProfiles",
  "maxQuestionsPerWeek" = EXCLUDED."maxQuestionsPerWeek",
  "maxFlashcardsPerWeek" = EXCLUDED."maxFlashcardsPerWeek",
  "maxSimuladosPerWeek" = EXCLUDED."maxSimuladosPerWeek",
  "maxRedacoesPerWeek" = EXCLUDED."maxRedacoesPerWeek",
  "maxCasosPerWeek" = EXCLUDED."maxCasosPerWeek",
  "maxEditalPerWeek" = EXCLUDED."maxEditalPerWeek",
  "maxPdfPerWeek" = EXCLUDED."maxPdfPerWeek",
  "hasGroupStudy" = EXCLUDED."hasGroupStudy",
  "hasLongTermMemory" = EXCLUDED."hasLongTermMemory",
  features = EXCLUDED.features, active = EXCLUDED.active;

-- ══════════════════════════════════════════════════════════════
-- 6. VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════
SELECT
  slug, name, price,
  "maxAgents" AS mentores, "maxProfiles" AS concursos,
  "aiCreditsPerWeek" AS msgs_sem,
  "maxQuestionsPerWeek" AS quest_sem,
  "maxFlashcardsPerWeek" AS flash_sem,
  "maxSimuladosPerWeek" AS simul_sem,
  "maxRedacoesPerWeek" AS redac_sem,
  "maxCasosPerWeek" AS casos_sem,
  "maxEditalPerWeek" AS edital_sem,
  "maxPdfPerWeek" AS pdf_sem,
  "hasGroupStudy" AS grupos,
  "hasLongTermMemory" AS mem_lp,
  active
FROM "Plan"
ORDER BY price;
