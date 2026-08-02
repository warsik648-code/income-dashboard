import type { ExchangeRateSource, PaymentMethod } from "@/generated/prisma/client"

import type { MoneyDecimalString } from "@/lib/money"

/**
 * Confirm a subscription renewal payment.
 *
 * MUST NOT run automatically when nextRenewalDate arrives.
 * Only call this after the user confirms payment was completed.
 *
 * In one Prisma interactive transaction this will:
 * 1. Create an EXPENSE with original amount/currency + frozen FX snapshot
 * 2. Link it via subscriptionId
 * 3. Deduct from the selected financial account (native currency balance)
 * 4. Write AuditLog rows
 * 5. Advance nextRenewalDate by billingFrequency / customIntervalDays
 *
 * Cancelled subscriptions keep linked transaction history.
 */
export type ConfirmRenewalPaymentInput = {
  userId: string
  subscriptionId: string
  /** Defaults to subscription.accountId when omitted. */
  accountId?: string
  /** Override amount; defaults to subscription.price. */
  amount?: MoneyDecimalString
  /**
   * USD per 1 unit of subscription currency.
   * Required when currency is not USD; ignored (forced to 1) for USD.
   */
  exchangeRate?: MoneyDecimalString
  exchangeRateAt?: Date
  exchangeRateSource?: ExchangeRateSource
  paymentMethod?: PaymentMethod
  paymentDate?: Date
  notes?: string
}

export type ConfirmRenewalPaymentResult = {
  transactionId: string
  subscriptionId: string
  nextRenewalDate: Date
}

/**
 * Implementation lands after the FX migration is applied.
 * Signature and contract are locked to the approved architecture.
 */
export async function confirmRenewalPayment(
  _input: ConfirmRenewalPaymentInput
): Promise<ConfirmRenewalPaymentResult> {
  throw new Error(
    "confirmRenewalPayment: not implemented until FX migration is applied"
  )
}

/**
 * Cancel a subscription without deleting payment history.
 * Sets status=CANCELLED and optional endDate; linked transactions remain.
 */
export async function cancelSubscription(_input: {
  userId: string
  subscriptionId: string
  endDate?: Date
  reason?: string
}): Promise<void> {
  throw new Error(
    "cancelSubscription: not implemented until FX migration is applied"
  )
}
