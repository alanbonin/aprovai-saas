-- ════════════════════════════════════════════════════════════════
-- MIGRATION: Multi-perfil por cargo
-- Execute no Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── 1. StudentProfile: 1 user → N profiles ───────────────────────────────
-- Remove constraint unique de userId (era 1:1, agora é 1:N)
ALTER TABLE "StudentProfile" DROP CONSTRAINT IF EXISTS "StudentProfile_userId_key";

-- Campos novos no StudentProfile
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "label"     TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Marca o perfil existente de cada usuário como padrão
UPDATE "StudentProfile"
SET "isDefault" = true,
    "label"     = COALESCE(NULLIF(TRIM(COALESCE(cargo, '') || ' ' || COALESCE(orgao, '')), ''), 'Perfil principal')
WHERE "isDefault" = false;

-- ── 2. User: aponta para o perfil ativo ──────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeProfileId" TEXT
  REFERENCES "StudentProfile"("id") ON DELETE SET NULL;

-- Preenche activeProfileId para todos os usuários que já têm um perfil
UPDATE "User" u
SET "activeProfileId" = sp."id"
FROM "StudentProfile" sp
WHERE sp."userId" = u."id" AND sp."isDefault" = true
  AND u."activeProfileId" IS NULL;

-- ── 3. Note: isola por perfil ─────────────────────────────────────────────
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "profileId" TEXT
  REFERENCES "StudentProfile"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Note_profileId_idx" ON "Note"("profileId");

-- ── 4. StudentSubject: isola por perfil ──────────────────────────────────
ALTER TABLE "StudentSubject" ADD COLUMN IF NOT EXISTS "profileId" TEXT
  REFERENCES "StudentProfile"("id") ON DELETE SET NULL;

-- Remove constraint antiga (userId, subjectId) e cria com profileId
ALTER TABLE "StudentSubject" DROP CONSTRAINT IF EXISTS "StudentSubject_userId_subjectId_key";

-- Constraint para linhas SEM profileId (perfil padrão / legado)
CREATE UNIQUE INDEX IF NOT EXISTS "StudentSubject_userId_subjectId_null_key"
  ON "StudentSubject"("userId", "subjectId")
  WHERE "profileId" IS NULL;

-- Constraint para linhas COM profileId (perfis específicos)
CREATE UNIQUE INDEX IF NOT EXISTS "StudentSubject_userId_profileId_subjectId_key"
  ON "StudentSubject"("userId", "profileId", "subjectId")
  WHERE "profileId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "StudentSubject_profileId_idx" ON "StudentSubject"("profileId");

-- ── 5. SimuladoHistory: isola por perfil ─────────────────────────────────
ALTER TABLE "SimuladoHistory" ADD COLUMN IF NOT EXISTS "profileId" TEXT
  REFERENCES "StudentProfile"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "SimuladoHistory_profileId_idx" ON "SimuladoHistory"("profileId");

-- ── 6. Progress: isola por perfil ────────────────────────────────────────
ALTER TABLE "Progress" ADD COLUMN IF NOT EXISTS "profileId" TEXT
  REFERENCES "StudentProfile"("id") ON DELETE SET NULL;

-- Remove constraint antiga e cria novas particionadas
ALTER TABLE "Progress" DROP CONSTRAINT IF EXISTS "Progress_userId_questionId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Progress_userId_questionId_null_key"
  ON "Progress"("userId", "questionId")
  WHERE "profileId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Progress_userId_profileId_questionId_key"
  ON "Progress"("userId", "profileId", "questionId")
  WHERE "profileId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Progress_profileId_idx" ON "Progress"("profileId");

-- ── 7. Plan: limite de perfis por plano ──────────────────────────────────
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxProfiles" INT NOT NULL DEFAULT 1;

-- Atualiza limites (ajuste os slugs conforme seus planos)
UPDATE "Plan" SET "maxProfiles" = 99
  WHERE LOWER(slug) LIKE '%pro%' OR LOWER(slug) LIKE '%premium%' OR LOWER(name) LIKE '%pro%';

UPDATE "Plan" SET "maxProfiles" = 2
  WHERE LOWER(slug) LIKE '%basic%' OR LOWER(slug) LIKE '%starter%' OR LOWER(slug) LIKE '%mensal%'
    AND "maxProfiles" = 1;

-- ── 8. UserAgent: isola agentes por perfil ───────────────────────────────
ALTER TABLE "UserAgent" ADD COLUMN IF NOT EXISTS "profileId" TEXT
  REFERENCES "StudentProfile"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "UserAgent_profileId_idx" ON "UserAgent"("profileId");

-- Migra os UserAgent existentes para o perfil padrão de cada usuário
UPDATE "UserAgent" ua
SET "profileId" = sp."id"
FROM "StudentProfile" sp
WHERE sp."userId" = ua."userId"
  AND sp."isDefault" = true
  AND ua."profileId" IS NULL;

-- ════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════
-- SELECT id, "userId", label, "isDefault" FROM "StudentProfile" LIMIT 10;
-- SELECT id, "activeProfileId" FROM "User" LIMIT 10;
-- SELECT id, "userId", "agentId", "profileId" FROM "UserAgent" LIMIT 10;
