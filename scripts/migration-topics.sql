-- ─── Migration: Tabela Topic (Assuntos dentro de Matérias) ───────────────────
-- Cria a camada Topic entre Subject (matéria) e Question (questão)
-- Relação: Subject 1→N Topic 1→N Question

-- 1. Cria tabela Topic
CREATE TABLE IF NOT EXISTS "Topic" (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "subjectId" TEXT        NOT NULL REFERENCES "Subject"(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  description TEXT,
  ordem       INT         NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("subjectId", slug)   -- slug único por matéria (não globalmente)
);

-- Índice para buscas por matéria
CREATE INDEX IF NOT EXISTS "Topic_subjectId_idx" ON "Topic"("subjectId");
CREATE INDEX IF NOT EXISTS "Topic_slug_idx" ON "Topic"(slug);

-- 2. Adiciona coluna topicId em Question (nullable — questões existentes ficam sem tópico)
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "topicId" UUID REFERENCES "Topic"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Question_topicId_idx" ON "Question"("topicId");

-- 3. Adiciona coluna topicId em Progress (para stats por assunto no futuro)
ALTER TABLE "Progress"
  ADD COLUMN IF NOT EXISTS "topicId" UUID REFERENCES "Topic"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Progress_topicId_idx" ON "Progress"("topicId");

-- 4. Trigger para auto-atualizar updatedAt em Topic
CREATE OR REPLACE FUNCTION update_topic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topic_updated_at ON "Topic";
CREATE TRIGGER topic_updated_at
  BEFORE UPDATE ON "Topic"
  FOR EACH ROW EXECUTE FUNCTION update_topic_updated_at();

-- 5. RLS (Row Level Security) — habilita e configura políticas
ALTER TABLE "Topic" ENABLE ROW LEVEL SECURITY;

-- Leitura pública para alunos autenticados
CREATE POLICY IF NOT EXISTS "Topic: leitura autenticados"
  ON "Topic" FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Escrita apenas para service_role (admin via backend)
CREATE POLICY IF NOT EXISTS "Topic: escrita service_role"
  ON "Topic" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
