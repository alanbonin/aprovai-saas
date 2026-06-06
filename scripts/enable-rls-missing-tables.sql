-- Migration: Habilitar RLS em tabelas críticas com dados de alunos
-- Executar no Supabase SQL Editor (como service_role / database owner)
-- Contexto: db client do servidor usa service_role, então estas políticas
-- bloqueiam acesso via anon key (defesa em profundidade)

-- ── Simulado e SimuladoAttempt (antes explicitamente DISABLED) ────────────────
ALTER TABLE "Simulado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SimuladoAttempt" ENABLE ROW LEVEL SECURITY;

-- Apenas service_role acessa — alunos não consultam essas tabelas diretamente
CREATE POLICY "simulado_service_role_only" ON "Simulado"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "simulado_attempt_service_role_only" ON "SimuladoAttempt"
  FOR ALL USING (auth.role() = 'service_role');

-- ── User ─────────────────────────────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Usuário lê/atualiza apenas seu próprio perfil; service_role acessa tudo
CREATE POLICY "user_own_data" ON "User"
  FOR ALL USING (
    auth.role() = 'service_role'
    OR auth.uid()::text = "supabaseId"
  );

-- ── Subscription ──────────────────────────────────────────────────────────────
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_service_role_only" ON "Subscription"
  FOR ALL USING (auth.role() = 'service_role');

-- ── Progress / QuestionProgress ───────────────────────────────────────────────
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_service_role_only" ON "Progress"
  FOR ALL USING (auth.role() = 'service_role');

-- ── Note (usada para favoritos, templates, etc.) ─────────────────────────────
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_service_role_only" ON "Note"
  FOR ALL USING (auth.role() = 'service_role');

-- ── StudentProfile ────────────────────────────────────────────────────────────
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_profile_service_role_only" ON "StudentProfile"
  FOR ALL USING (auth.role() = 'service_role');

-- ── AiUsage ───────────────────────────────────────────────────────────────────
ALTER TABLE "AiUsage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_service_role_only" ON "AiUsage"
  FOR ALL USING (auth.role() = 'service_role');

-- ── SimuladoHistory ───────────────────────────────────────────────────────────
ALTER TABLE "SimuladoHistory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulado_history_service_role_only" ON "SimuladoHistory"
  FOR ALL USING (auth.role() = 'service_role');

-- ── Verificação final: listar tabelas e status de RLS ─────────────────────────
-- Executar esta query separadamente para confirmar:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
