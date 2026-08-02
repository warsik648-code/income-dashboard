-- AlterTable: dedicated renewal period for subscription payment dedupe
ALTER TABLE "Transaction" ADD COLUMN "renewalPeriod" TEXT;

-- Backfill from legacy notes marker: renewalPeriod:YYYY-MM-DD
UPDATE "Transaction"
SET "renewalPeriod" = substring(notes FROM 'renewalPeriod:([0-9]{4}-[0-9]{2}-[0-9]{2})')
WHERE "subscriptionId" IS NOT NULL
  AND notes IS NOT NULL
  AND notes ~ 'renewalPeriod:[0-9]{4}-[0-9]{2}-[0-9]{2}'
  AND "renewalPeriod" IS NULL;

-- Deduplicate any collisions before unique index (keep oldest row's period; clear others)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "subscriptionId", "renewalPeriod"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "Transaction"
  WHERE "subscriptionId" IS NOT NULL
    AND "renewalPeriod" IS NOT NULL
)
UPDATE "Transaction" t
SET "renewalPeriod" = NULL
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- CreateUniqueIndex (PostgreSQL allows multiple NULLs in unique columns)
CREATE UNIQUE INDEX "Transaction_subscriptionId_renewalPeriod_key"
ON "Transaction"("subscriptionId", "renewalPeriod");

-- AddForeignKey: DebtPayment.transactionId -> Transaction.id
ALTER TABLE "DebtPayment"
ADD CONSTRAINT "DebtPayment_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
