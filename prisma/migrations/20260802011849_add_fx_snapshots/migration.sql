/*
  Warnings:

  - Added the required column `baseAmountUsd` to the `Debt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRate` to the `Debt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRateAt` to the `Debt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRateSource` to the `Debt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `baseAmountUsd` to the `DebtPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRate` to the `DebtPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRateAt` to the `DebtPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRateSource` to the `DebtPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `baseAmountUsd` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRate` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRateAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRateSource` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'USER_OVERRIDE', 'PROVIDER', 'FIXED_USD');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('FIAT', 'CRYPTO');

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "baseAmountUsd" DECIMAL(19,4) NOT NULL,
ADD COLUMN     "exchangeRate" DECIMAL(24,12) NOT NULL,
ADD COLUMN     "exchangeRateAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "exchangeRateSource" "ExchangeRateSource" NOT NULL;

-- AlterTable
ALTER TABLE "DebtPayment" ADD COLUMN     "baseAmountUsd" DECIMAL(19,4) NOT NULL,
ADD COLUMN     "exchangeRate" DECIMAL(24,12) NOT NULL,
ADD COLUMN     "exchangeRateAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "exchangeRateSource" "ExchangeRateSource" NOT NULL;

-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN     "assetClass" "AssetClass" NOT NULL DEFAULT 'FIAT';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "baseAmountUsd" DECIMAL(19,4) NOT NULL,
ADD COLUMN     "exchangeRate" DECIMAL(24,12) NOT NULL,
ADD COLUMN     "exchangeRateAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "exchangeRateSource" "ExchangeRateSource" NOT NULL;

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_assetClass_deletedAt_idx" ON "FinancialAccount"("userId", "assetClass", "deletedAt");
