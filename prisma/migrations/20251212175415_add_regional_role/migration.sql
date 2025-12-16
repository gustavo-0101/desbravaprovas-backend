-- AlterEnum: Adicionar REGIONAL ao enum PapelGlobal
ALTER TYPE "PapelGlobal" ADD VALUE 'REGIONAL';

-- CreateTable: RegionalClube (relacionamento N:N entre REGIONAL e Clubes)
CREATE TABLE "RegionalClube" (
    "id" SERIAL NOT NULL,
    "regionalId" INTEGER NOT NULL,
    "clubeId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionalClube_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegionalClube_regionalId_idx" ON "RegionalClube"("regionalId");

-- CreateIndex
CREATE INDEX "RegionalClube_clubeId_idx" ON "RegionalClube"("clubeId");

-- CreateIndex (Unique constraint: um regional não pode supervisionar o mesmo clube duas vezes)
CREATE UNIQUE INDEX "RegionalClube_regionalId_clubeId_key" ON "RegionalClube"("regionalId", "clubeId");

-- AddForeignKey
ALTER TABLE "RegionalClube" ADD CONSTRAINT "RegionalClube_regionalId_fkey" FOREIGN KEY ("regionalId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalClube" ADD CONSTRAINT "RegionalClube_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Clube"("id") ON DELETE CASCADE ON UPDATE CASCADE;
