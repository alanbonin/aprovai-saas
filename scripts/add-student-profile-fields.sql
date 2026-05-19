-- Migração: adiciona campos extras ao StudentProfile para personalização da IA
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "horasEstudo"     INTEGER,       -- horas/dia disponíveis
  ADD COLUMN IF NOT EXISTS "nivelAtual"      TEXT,          -- iniciante | intermediario | avancado
  ADD COLUMN IF NOT EXISTS "disponibilidade" TEXT;          -- manha | tarde | noite | variado

-- Confirma
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'StudentProfile'
ORDER BY ordinal_position;
