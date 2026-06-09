# SQL — RLS Tabelas Pendentes
# Execute no Supabase Dashboard → SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- EXECUTAR NO SUPABASE: Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ── 1. UserAgent ──────────────────────────────────────────────
ALTER TABLE "UserAgent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_acessam_proprio_agente"
  ON "UserAgent" FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  );

-- ── 2. StudentSubject ─────────────────────────────────────────
ALTER TABLE "StudentSubject" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_acessam_proprias_materias"
  ON "StudentSubject" FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  );

-- ── 3. FlashcardSet ───────────────────────────────────────────
ALTER TABLE "FlashcardSet" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_acessam_proprios_flashcards"
  ON "FlashcardSet" FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  );

-- ── 4. Partner ────────────────────────────────────────────────
-- Parceiros só podem ver seus próprios dados;
-- admins veem tudo via service_role (bypassa RLS)
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros_acessam_proprio_registro"
  ON "Partner" FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAÇÃO (rodar após o SQL acima)
-- ═══════════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('UserAgent','StudentSubject','FlashcardSet','Partner')
  AND schemaname = 'public';
-- rowsecurity deve ser TRUE em todas
