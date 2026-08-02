-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN     "institution" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_isArchived_deletedAt_idx" ON "FinancialAccount"("userId", "isArchived", "deletedAt");
