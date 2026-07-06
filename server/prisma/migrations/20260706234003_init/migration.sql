-- CreateTable
CREATE TABLE "politicos" (
    "id" TEXT NOT NULL,
    "openstatesId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "foto" TEXT,
    "estado" TEXT NOT NULL,
    "partido" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "politicos_openstatesId_key" ON "politicos"("openstatesId");

-- CreateIndex
CREATE INDEX "politicos_estado_idx" ON "politicos"("estado");

-- CreateIndex
CREATE INDEX "politicos_partido_idx" ON "politicos"("partido");
