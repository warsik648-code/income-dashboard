-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'TRIAL', 'EXPIRED');

-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'SUBSCRIPTION';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "subscriptionId" TEXT;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "logoUrl" TEXT,
    "price" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "billingFrequency" "BillingFrequency" NOT NULL,
    "customIntervalDays" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextRenewalDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "accountId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "categoryId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_userId_status_deletedAt_idx" ON "Subscription"("userId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_nextRenewalDate_deletedAt_idx" ON "Subscription"("userId", "nextRenewalDate", "deletedAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_currency_deletedAt_idx" ON "Subscription"("userId", "currency", "deletedAt");

-- CreateIndex
CREATE INDEX "Subscription_accountId_idx" ON "Subscription"("accountId");

-- CreateIndex
CREATE INDEX "Subscription_categoryId_idx" ON "Subscription"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_subscriptionId_idx" ON "Transaction"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
