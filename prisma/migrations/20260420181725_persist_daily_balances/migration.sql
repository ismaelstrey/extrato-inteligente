/*
  Warnings:

  - A unique constraint covering the columns `[statementId,dedupeKey]` on the table `ExtractionIssue` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ExtractionIssue" ADD COLUMN     "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "StatementDailyBalance" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementDailyBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementDailyBalance_statementId_date_idx" ON "StatementDailyBalance"("statementId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StatementDailyBalance_statementId_date_key" ON "StatementDailyBalance"("statementId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionIssue_statementId_dedupeKey_key" ON "ExtractionIssue"("statementId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "StatementDailyBalance" ADD CONSTRAINT "StatementDailyBalance_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
