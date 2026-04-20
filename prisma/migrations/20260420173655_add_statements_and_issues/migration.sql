-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('UPLOADED', 'PROCESSED', 'IN_REVIEW', 'APPROVED', 'EXPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('TEXT', 'OCR', 'HYBRID');

-- CreateEnum
CREATE TYPE "ExtractionRunStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('TEMPLATE_NAO_ENCONTRADO', 'PARSE_FALHOU', 'SALDO_DIVERGENTE', 'DATA_FORA_PERIODO', 'VALOR_INVALIDO', 'OCR_BAIXA_CONFIANCA', 'OUTRO');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "statementId" TEXT;

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "templateId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" "StatementStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionRun" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "method" "ExtractionMethod" NOT NULL DEFAULT 'TEXT',
    "status" "ExtractionRunStatus" NOT NULL DEFAULT 'RUNNING',
    "pagesTotal" INTEGER,
    "metrics" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionIssue" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "runId" TEXT,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "type" "IssueType" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "ExtractionIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Statement_clientId_createdAt_idx" ON "Statement"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Statement_entityId_createdAt_idx" ON "Statement"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ExtractionRun_statementId_startedAt_idx" ON "ExtractionRun"("statementId", "startedAt");

-- CreateIndex
CREATE INDEX "ExtractionIssue_statementId_status_severity_idx" ON "ExtractionIssue"("statementId", "status", "severity");

-- CreateIndex
CREATE INDEX "Transaction_statementId_data_idx" ON "Transaction"("statementId", "data");

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionIssue" ADD CONSTRAINT "ExtractionIssue_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
