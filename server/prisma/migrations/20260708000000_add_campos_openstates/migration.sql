-- AlterTable
ALTER TABLE "politicos" ADD COLUMN     "camara" TEXT,
ADD COLUMN     "contatos" JSONB,
ADD COLUMN     "distrito" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "falecimento" DATE,
ADD COLUMN     "genero" TEXT,
ADD COLUMN     "nascimento" DATE,
ADD COLUMN     "openstatesUrl" TEXT,
ADD COLUMN     "primeiroNome" TEXT,
ADD COLUMN     "raw" JSONB,
ADD COLUMN     "sobrenome" TEXT;
