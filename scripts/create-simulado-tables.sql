-- Tabela principal de simulados (criados pelo admin)
CREATE TABLE IF NOT EXISTS "Simulado" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  "agentId"     TEXT,
  "agentName"   TEXT,
  banca         TEXT,
  "subjectIds"  TEXT[] DEFAULT '{}',
  questions     JSONB NOT NULL DEFAULT '[]',
  "totalQuestions" INT NOT NULL DEFAULT 0,
  "timeLimitMins"  INT DEFAULT 60,
  active        BOOLEAN DEFAULT true,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW()
);

-- Tentativas dos alunos
CREATE TABLE IF NOT EXISTS "SimuladoAttempt" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "simuladoId"  TEXT NOT NULL REFERENCES "Simulado"(id) ON DELETE CASCADE,
  "userId"      TEXT NOT NULL,
  answers       JSONB NOT NULL DEFAULT '{}',
  score         INT,
  "timeSecs"    INT,
  "completedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulado_attempt_user ON "SimuladoAttempt"("userId");
CREATE INDEX IF NOT EXISTS idx_simulado_attempt_simulado ON "SimuladoAttempt"("simuladoId");

-- RLS: desabilitado (usamos service_role no servidor)
ALTER TABLE "Simulado" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SimuladoAttempt" DISABLE ROW LEVEL SECURITY;
