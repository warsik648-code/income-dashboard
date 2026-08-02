-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
ADD COLUMN     "defaultExpenseAccountId" TEXT,
ADD COLUMN     "defaultIncomeAccountId" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "numberFormat" TEXT NOT NULL DEFAULT 'en-US',
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateIndex
CREATE INDEX "User_defaultIncomeAccountId_idx" ON "User"("defaultIncomeAccountId");

-- CreateIndex
CREATE INDEX "User_defaultExpenseAccountId_idx" ON "User"("defaultExpenseAccountId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultIncomeAccountId_fkey" FOREIGN KEY ("defaultIncomeAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultExpenseAccountId_fkey" FOREIGN KEY ("defaultExpenseAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
