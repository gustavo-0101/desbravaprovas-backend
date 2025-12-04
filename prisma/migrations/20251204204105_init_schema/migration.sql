-- CreateEnum
CREATE TYPE "PapelGlobal" AS ENUM ('USUARIO', 'MASTER');

-- CreateEnum
CREATE TYPE "PapelClube" AS ENUM ('ADMIN_CLUBE', 'CONSELHEIRO', 'DESBRAVADOR');

-- CreateEnum
CREATE TYPE "StatusMembro" AS ENUM ('PENDENTE', 'ATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "VisibilidadeProva" AS ENUM ('PRIVADA', 'UNIDADE', 'CLUBE', 'PUBLICA');

-- CreateEnum
CREATE TYPE "TipoQuestao" AS ENUM ('MULTIPLA_ESCOLHA', 'DISSERTATIVA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papelGlobal" "PapelGlobal" NOT NULL DEFAULT 'USUARIO',
    "fotoPerfilUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clube" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" SERIAL NOT NULL,
    "clubeId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroClube" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "clubeId" INTEGER NOT NULL,
    "unidadeId" INTEGER,
    "papel" "PapelClube" NOT NULL,
    "status" "StatusMembro" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembroClube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Especialidade" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Especialidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prova" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "clubeId" INTEGER NOT NULL,
    "unidadeId" INTEGER,
    "especialidadeId" INTEGER,
    "criadaPorId" INTEGER NOT NULL,
    "valorTotal" INTEGER NOT NULL DEFAULT 100,
    "visibilidade" "VisibilidadeProva" NOT NULL DEFAULT 'CLUBE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "provaOriginalId" INTEGER,

    CONSTRAINT "Prova_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questao" (
    "id" SERIAL NOT NULL,
    "provaId" INTEGER NOT NULL,
    "tipo" "TipoQuestao" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" JSONB,
    "respostaCorreta" TEXT,
    "valor" INTEGER NOT NULL DEFAULT 10,
    "geradaPorIA" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaProva" (
    "id" SERIAL NOT NULL,
    "provaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "respostas" JSONB NOT NULL,
    "notaObjetiva" DOUBLE PRECISION,
    "notaDissertativa" DOUBLE PRECISION,
    "notaFinal" DOUBLE PRECISION,
    "corrigidaAutomaticamente" BOOLEAN NOT NULL DEFAULT false,
    "precisaCorrecaoManual" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaProva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Clube_slug_key" ON "Clube"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MembroClube_usuarioId_clubeId_key" ON "MembroClube"("usuarioId", "clubeId");

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroClube" ADD CONSTRAINT "MembroClube_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroClube" ADD CONSTRAINT "MembroClube_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroClube" ADD CONSTRAINT "MembroClube_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prova" ADD CONSTRAINT "Prova_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prova" ADD CONSTRAINT "Prova_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prova" ADD CONSTRAINT "Prova_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "Especialidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prova" ADD CONSTRAINT "Prova_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prova" ADD CONSTRAINT "Prova_provaOriginalId_fkey" FOREIGN KEY ("provaOriginalId") REFERENCES "Prova"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questao" ADD CONSTRAINT "Questao_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaProva" ADD CONSTRAINT "RespostaProva_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaProva" ADD CONSTRAINT "RespostaProva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
