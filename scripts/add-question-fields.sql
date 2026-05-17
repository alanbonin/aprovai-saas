-- Novos campos nas questões
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS artigo TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "dicaBanca" TEXT;

-- Tabelas de simulado (caso ainda não existam)
CREATE TABLE IF NOT EXISTS "Simulado" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "agentId" TEXT,
  "agentName" TEXT,
  banca TEXT,
  "subjectIds" TEXT[] DEFAULT '{}',
  questions JSONB NOT NULL DEFAULT '[]',
  "totalQuestions" INT NOT NULL DEFAULT 0,
  "timeLimitMins" INT DEFAULT 60,
  active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SimuladoAttempt" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "simuladoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INT,
  "timeSecs" INT,
  "completedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "Simulado" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SimuladoAttempt" DISABLE ROW LEVEL SECURITY;
