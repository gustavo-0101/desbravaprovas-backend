-- Fix baseline drift: Apply changes that were missing from baseline migration
-- This migration adds all the columns and changes that were documented but not applied

-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "CategoriaEspecialidade" AS ENUM ('ADRA', 'ARTES_E_HABILIDADES_MANUAIS', 'ATIVIDADES_AGRICOLAS', 'ATIVIDADES_MISSIONARIAS_E_COMUNITARIAS', 'ATIVIDADES_PROFISSIONAIS', 'ATIVIDADES_RECREATIVAS', 'CIENCIA_E_SAUDE', 'ESTUDOS_DA_NATUREZA', 'HABILIDADES_DOMESTICAS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum: Add INSTRUTOR to PapelClube (if not exists)
DO $$ BEGIN
    ALTER TYPE "PapelClube" ADD VALUE IF NOT EXISTS 'INSTRUTOR';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum: Add PRATICA to TipoQuestao (if not exists)
DO $$ BEGIN
    ALTER TYPE "TipoQuestao" ADD VALUE IF NOT EXISTS 'PRATICA';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Usuario: Add missing columns
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "clubeCriadoId" INTEGER;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "emailVerificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "tokenRecuperacaoExpira" TIMESTAMP(3);
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "tokenRecuperacaoSenha" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "tokenVerificacao" TEXT;
ALTER TABLE "Usuario" ALTER COLUMN "senhaHash" DROP NOT NULL;

-- AlterTable Clube: Add missing columns
ALTER TABLE "Clube" ADD COLUMN IF NOT EXISTS "atualizadoEm" TIMESTAMP(3);
ALTER TABLE "Clube" ADD COLUMN IF NOT EXISTS "cidade" TEXT;
ALTER TABLE "Clube" ADD COLUMN IF NOT EXISTS "estado" TEXT;
ALTER TABLE "Clube" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Clube" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Clube" ADD COLUMN IF NOT EXISTS "pais" TEXT DEFAULT 'Brasil';

-- Update existing rows to have required values
UPDATE "Clube" SET "atualizadoEm" = CURRENT_TIMESTAMP WHERE "atualizadoEm" IS NULL;
UPDATE "Clube" SET "cidade" = 'Não informado' WHERE "cidade" IS NULL;
UPDATE "Clube" SET "estado" = 'N/A' WHERE "estado" IS NULL;
UPDATE "Clube" SET "pais" = 'Brasil' WHERE "pais" IS NULL;

-- Now make them NOT NULL
ALTER TABLE "Clube" ALTER COLUMN "atualizadoEm" SET NOT NULL;
ALTER TABLE "Clube" ALTER COLUMN "cidade" SET NOT NULL;
ALTER TABLE "Clube" ALTER COLUMN "estado" SET NOT NULL;

-- AlterTable MembroClube: Add missing columns
ALTER TABLE "MembroClube" ADD COLUMN IF NOT EXISTS "atualizadoEm" TIMESTAMP(3);
ALTER TABLE "MembroClube" ADD COLUMN IF NOT EXISTS "batizado" BOOLEAN DEFAULT false;
ALTER TABLE "MembroClube" ADD COLUMN IF NOT EXISTS "cargoEspecifico" TEXT;
ALTER TABLE "MembroClube" ADD COLUMN IF NOT EXISTS "dataNascimento" TIMESTAMP(3);

-- Update existing rows
UPDATE "MembroClube" SET "atualizadoEm" = CURRENT_TIMESTAMP WHERE "atualizadoEm" IS NULL;
UPDATE "MembroClube" SET "batizado" = false WHERE "batizado" IS NULL;
UPDATE "MembroClube" SET "dataNascimento" = '1990-01-01' WHERE "dataNascimento" IS NULL;

-- Make required columns NOT NULL
ALTER TABLE "MembroClube" ALTER COLUMN "atualizadoEm" SET NOT NULL;
ALTER TABLE "MembroClube" ALTER COLUMN "batizado" SET NOT NULL;
ALTER TABLE "MembroClube" ALTER COLUMN "dataNascimento" SET NOT NULL;

-- AlterTable Prova: Add/modify columns
ALTER TABLE "Prova" ADD COLUMN IF NOT EXISTS "autorOriginalId" INTEGER;
ALTER TABLE "Prova" ADD COLUMN IF NOT EXISTS "categoria" "CategoriaEspecialidade";
ALTER TABLE "Prova" ADD COLUMN IF NOT EXISTS "criadorId" INTEGER;
ALTER TABLE "Prova" ADD COLUMN IF NOT EXISTS "descricao" TEXT;
ALTER TABLE "Prova" ADD COLUMN IF NOT EXISTS "urlReferenciaMDA" TEXT;

-- Handle Prova columns that might have been removed
-- Note: This migration assumes these columns don't exist or can be safely ignored

-- AlterTable Questao: Add missing columns
ALTER TABLE "Questao" ADD COLUMN IF NOT EXISTS "atualizadoEm" TIMESTAMP(3);
ALTER TABLE "Questao" ADD COLUMN IF NOT EXISTS "criadoEm" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Questao" ADD COLUMN IF NOT EXISTS "opcoes" JSONB;
ALTER TABLE "Questao" ADD COLUMN IF NOT EXISTS "ordem" INTEGER;
ALTER TABLE "Questao" ADD COLUMN IF NOT EXISTS "pontuacao" INTEGER DEFAULT 1;

-- Update existing rows
UPDATE "Questao" SET "atualizadoEm" = CURRENT_TIMESTAMP WHERE "atualizadoEm" IS NULL;
UPDATE "Questao" SET "criadoEm" = CURRENT_TIMESTAMP WHERE "criadoEm" IS NULL;
UPDATE "Questao" SET "ordem" = id WHERE "ordem" IS NULL;
UPDATE "Questao" SET "pontuacao" = 1 WHERE "pontuacao" IS NULL;

-- Make required columns NOT NULL
ALTER TABLE "Questao" ALTER COLUMN "atualizadoEm" SET NOT NULL;
ALTER TABLE "Questao" ALTER COLUMN "criadoEm" SET NOT NULL;
ALTER TABLE "Questao" ALTER COLUMN "ordem" SET NOT NULL;
ALTER TABLE "Questao" ALTER COLUMN "pontuacao" SET NOT NULL;

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "Prova_clubeId_idx" ON "Prova"("clubeId");
CREATE INDEX IF NOT EXISTS "Prova_unidadeId_idx" ON "Prova"("unidadeId");
CREATE INDEX IF NOT EXISTS "Prova_criadorId_idx" ON "Prova"("criadorId");
CREATE INDEX IF NOT EXISTS "Prova_visibilidade_idx" ON "Prova"("visibilidade");
CREATE INDEX IF NOT EXISTS "Questao_provaId_idx" ON "Questao"("provaId");

-- CreateUnique constraints (if not exists)
DO $$ BEGIN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tokenVerificacao_key" UNIQUE ("tokenVerificacao");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tokenRecuperacaoSenha_key" UNIQUE ("tokenRecuperacaoSenha");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_googleId_key" UNIQUE ("googleId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clubeCriadoId_key" UNIQUE ("clubeCriadoId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clubeCriadoId_fkey"
        FOREIGN KEY ("clubeCriadoId") REFERENCES "Clube"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
