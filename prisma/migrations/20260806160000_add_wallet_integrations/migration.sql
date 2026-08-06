-- CreateEnum
CREATE TYPE "WalletName" AS ENUM ('TRUST', 'BINANCE');

-- CreateEnum
CREATE TYPE "WalletAsset" AS ENUM ('USDT', 'BTC', 'ETH', 'LTC');

-- CreateEnum
CREATE TYPE "WalletNetwork" AS ENUM ('TRON', 'BITCOIN', 'ETHEREUM', 'LITECOIN');

-- CreateTable
CREATE TABLE "WalletIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletName" "WalletName" NOT NULL,
    "asset" "WalletAsset" NOT NULL,
    "network" "WalletNetwork" NOT NULL,
    "publicAddress" TEXT NOT NULL DEFAULT '',
    "financialAccountId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSuccessfulRefresh" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletIntegration_userId_isEnabled_idx" ON "WalletIntegration"("userId", "isEnabled");

-- CreateIndex
CREATE INDEX "WalletIntegration_financialAccountId_idx" ON "WalletIntegration"("financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletIntegration_userId_walletName_asset_network_key" ON "WalletIntegration"("userId", "walletName", "asset", "network");

-- AddForeignKey
ALTER TABLE "WalletIntegration" ADD CONSTRAINT "WalletIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletIntegration" ADD CONSTRAINT "WalletIntegration_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
