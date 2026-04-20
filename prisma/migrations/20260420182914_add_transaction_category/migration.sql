-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('PIX', 'VENDAS', 'RENDIMENTO', 'TARIFA', 'JUROS', 'IMPOSTOS', 'TRANSFERENCIA', 'ESTORNO', 'OUTROS');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "categoria" "TransactionCategory" NOT NULL DEFAULT 'OUTROS';
