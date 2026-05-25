-- Adiciona suporte a múltiplas modalidades de estudo no StudentProfile
ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "modalidade"   TEXT NOT NULL DEFAULT 'CONCURSO_PUBLICO',
  ADD COLUMN IF NOT EXISTS "vestibular"   TEXT,
  ADD COLUMN IF NOT EXISTS "trilha"       TEXT,
  ADD COLUMN IF NOT EXISTS "oabFase"      TEXT,
  ADD COLUMN IF NOT EXISTS "banca"        TEXT;

COMMENT ON COLUMN "StudentProfile"."modalidade" IS 'CONCURSO_PUBLICO | ENEM | VESTIBULAR | OAB | REVALIDA | CFC';
COMMENT ON COLUMN "StudentProfile"."vestibular" IS 'FUVEST | UNICAMP | UNESP | UERJ | outro (only for VESTIBULAR modalidade)';
COMMENT ON COLUMN "StudentProfile"."trilha"     IS 'Medicina | Direito | Engenharia | Administração | outro (for VESTIBULAR)';
COMMENT ON COLUMN "StudentProfile"."oabFase"    IS 'primeira | segunda (only for OAB modalidade)';
COMMENT ON COLUMN "StudentProfile"."banca"      IS 'Explicit banca stored separately from cargo/orgao context';
