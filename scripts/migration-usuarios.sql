-- ============================================================
-- Migração: Campos de segmentação de usuários + tabela Partner
-- Executar no Supabase SQL Editor ou via psql
-- ============================================================

-- 1. Adicionar campos na tabela User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS "partnerId" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "groupTag" TEXT NULL;

-- 2. Criar tabela Partner
CREATE TABLE IF NOT EXISTS "Partner" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  "contactEmail" TEXT NOT NULL,
  description TEXT,
  "commissionRate" FLOAT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índice para busca por parceiro
CREATE INDEX IF NOT EXISTS "User_partnerId_idx" ON "User"("partnerId");
CREATE INDEX IF NOT EXISTS "User_origin_idx" ON "User"(origin);
CREATE INDEX IF NOT EXISTS "User_groupTag_idx" ON "User"("groupTag");

-- 4. RLS (Row Level Security) para Partner — somente service role pode escrever
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_read_admin" ON "Partner"
  FOR SELECT USING (true);

CREATE POLICY "partner_write_service" ON "Partner"
  FOR ALL USING (auth.role() = 'service_role');
