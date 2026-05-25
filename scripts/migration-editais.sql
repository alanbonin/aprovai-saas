-- ================================================================
-- Migration: Radar de Editais
-- Aplicar em: Supabase Dashboard > SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS "Edital" (
  "id"                  TEXT        NOT NULL,
  "titulo"              TEXT        NOT NULL,
  "orgao"               TEXT        NOT NULL,
  "cargo"               TEXT        NOT NULL,
  "area"                TEXT,
  "vagas"               INTEGER,
  "salario"             FLOAT8,
  "salarioMax"          FLOAT8,
  "banca"               TEXT,
  "estado"              TEXT,
  "nivel"               TEXT        NOT NULL DEFAULT 'federal',
  "escolaridade"        TEXT,
  "status"              TEXT        NOT NULL DEFAULT 'previsto',
  "descricao"           TEXT,
  "dataPublicacao"      TIMESTAMPTZ,
  "dataInscricaoInicio" TIMESTAMPTZ,
  "dataInscricaoFim"    TIMESTAMPTZ,
  "dataProva"           TIMESTAMPTZ,
  "link"                TEXT,
  "editalUrl"           TEXT,
  "source"              TEXT        NOT NULL DEFAULT 'manual',
  "sourceRef"           TEXT,
  "isPremium"           BOOLEAN     NOT NULL DEFAULT false,
  "active"              BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Edital_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EditalFavorito" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "editalId"  TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EditalFavorito_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "EditalFavorito_userId_fkey"  FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE CASCADE,
  CONSTRAINT "EditalFavorito_editalId_fkey" FOREIGN KEY ("editalId") REFERENCES "Edital"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EditalFavorito_userId_editalId_key"
  ON "EditalFavorito"("userId", "editalId");

-- Torna subjectId opcional em Note (necessário para plano semanal)
ALTER TABLE "Note" ALTER COLUMN "subjectId" DROP NOT NULL;
