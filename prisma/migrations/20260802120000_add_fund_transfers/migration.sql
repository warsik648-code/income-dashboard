-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "transferId" TEXT;

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "sourceAmount" DECIMAL(19,4) NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "destinationAmount" DECIMAL(19,4) NOT NULL,
    "destinationCurrency" TEXT NOT NULL,
    "suggestedExchangeRate" DECIMAL(24,12),
    "effectiveExchangeRate" DECIMAL(24,12) NOT NULL,
    "suggestedDestinationAmount" DECIMAL(19,4),
    "sourceBaseAmountUsd" DECIMAL(19,4) NOT NULL,
    "destinationBaseAmountUsd" DECIMAL(19,4) NOT NULL,
    "feeAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "feeCurrency" TEXT,
    "feeBaseAmountUsd" DECIMAL(19,4),
    "feePaidSeparately" BOOLEAN NOT NULL DEFAULT false,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_userId_idempotencyKey_key" ON "Transfer"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Transfer_userId_status_deletedAt_idx" ON "Transfer"("userId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Transfer_userId_transferredAt_deletedAt_idx" ON "Transfer"("userId", "transferredAt", "deletedAt");

-- CreateIndex
CREATE INDEX "Transfer_fromAccountId_status_deletedAt_idx" ON "Transfer"("fromAccountId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Transfer_toAccountId_status_deletedAt_idx" ON "Transfer"("toAccountId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_transferId_idx" ON "Transaction"("transferId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
