-- CreateEnum
CREATE TYPE "TransactionAuditAction" AS ENUM ('UPDATE');

-- CreateTable
CREATE TABLE "TransactionAudit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "TransactionAuditAction" NOT NULL DEFAULT 'UPDATE',
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionAudit_transactionId_createdAt_idx" ON "TransactionAudit"("transactionId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionAudit_userId_createdAt_idx" ON "TransactionAudit"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransactionAudit" ADD CONSTRAINT "TransactionAudit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAudit" ADD CONSTRAINT "TransactionAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
