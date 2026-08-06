import { z } from "zod"

import { looksLikeSecretMaterial } from "@/lib/wallets/address"
import { isValidPublicAddress } from "@/lib/wallets/address"

const walletNameSchema = z.enum(["TRUST", "BINANCE"])
const walletAssetSchema = z.enum(["USDT", "BTC", "ETH", "LTC"])
const walletNetworkSchema = z.enum([
  "TRON",
  "BITCOIN",
  "ETHEREUM",
  "LITECOIN",
])

export const walletIntegrationIdSchema = z.object({
  id: z.string().trim().min(1, "Integration id is required"),
})

export const updateWalletIntegrationSchema = z
  .object({
    id: z.string().trim().min(1, "Integration id is required"),
    publicAddress: z.string().trim().max(128).default(""),
    financialAccountId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    isEnabled: z
      .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        if (typeof v === "boolean") return v
        return v === "true" || v === "on"
      }),
    network: walletNetworkSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (looksLikeSecretMaterial(data.publicAddress)) {
      ctx.addIssue({
        code: "custom",
        path: ["publicAddress"],
        message:
          "Only public addresses are allowed. Never paste a seed phrase or private key.",
      })
      return
    }
    if (data.publicAddress && data.network) {
      if (!isValidPublicAddress(data.network, data.publicAddress)) {
        ctx.addIssue({
          code: "custom",
          path: ["publicAddress"],
          message: `Invalid public address for ${data.network}`,
        })
      }
    }
  })

export type UpdateWalletIntegrationInput = z.infer<
  typeof updateWalletIntegrationSchema
>

export {
  walletNameSchema,
  walletAssetSchema,
  walletNetworkSchema,
}
