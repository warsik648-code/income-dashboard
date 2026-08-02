# Production runbook

Do not deploy until Critical #3 (renewalPeriod unique) is applied, CI is green, and you explicitly approve a deploy.

## Pre-deploy gates

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass (CI on PR).
2. `prisma migrate deploy` applied on the production database (never `migrate reset`).
3. Subscription renewals use `Transaction.renewalPeriod` + unique `(subscriptionId, renewalPeriod)` — not notes text.
4. Supabase `financial-attachments` bucket is **private** (no public policies).
5. Rotate any secrets that were ever pasted in chat; remove `OWNER_EMAIL` / `OWNER_PASSWORD` from production after seed.
6. Smoke test: login → dashboard → create income/expense → confirm subscription → export CSV (POST) → sign out.

## Soft-delete / ledger policy

- Soft-deleting a **Subscription** or **Debt** archives the parent record only.
- Linked payment **transactions stay in the ledger** because cash already moved. Account balances remain correct.
- Those linked transactions cannot be edited/deleted from Income/Expenses (owning-service rule).
- Do **not** cascade soft-delete linked expenses on archive — that would incorrectly inflate balances.

## Supabase Storage — private bucket (required)

1. Bucket name matches `SUPABASE_ATTACHMENTS_BUCKET` (default: `financial-attachments`).
2. Bucket is **Private**.
3. No public read/write Storage policies.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` via `NEXT_PUBLIC_`.
5. Browser access only via short-lived signed URLs after ownership checks.

## Required production environment variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres (server-only) |
| `AUTH_SECRET` | Strong random secret |
| `AUTH_URL` | Public HTTPS origin |
| `AUTH_TRUST_HOST` | `true` behind Vercel / reverse proxies |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only |
| `SUPABASE_ATTACHMENTS_BUCKET` | Private bucket name |
| `SUPABASE_SIGNED_URL_TTL_SECONDS` | Optional; 30–3600, default 120 |

## Hosting (recommended)

- **App:** Vercel (Next.js)
- **DB:** Supabase Postgres (or Neon)
- **Files:** Supabase Storage private bucket

### Deploy steps

1. Set production env vars in the host.
2. Run `pnpm exec prisma migrate deploy` against production `DATABASE_URL`.
3. Deploy the Next.js app.
4. Seed owner once if needed (`pnpm db:seed-owner`), then remove owner seed env vars.
5. Run the smoke checklist above.

### Rollback

1. Revert the app deployment to the previous release.
2. Do **not** automatically roll back migrations unless you have a tested down migration; prefer forward-fix.
3. If Storage was misconfigured as public: make private immediately, rotate service role key, audit access.

## Login rate limiting

In-memory rate limit is fine for a single Node instance. For multiple instances, add Redis/Upstash before scaling out. Prefer the edge/proxy client IP (`x-forwarded-for` first hop from a trusted proxy only).

## Dependency CVEs

`pnpm audit` may still report transitive `sharp` / `postcss` issues bundled by Next.js. Track Next.js patch releases; avoid unrelated major upgrades. Re-run `pnpm audit` after each Next bump.

## Backups

- Enable Postgres PITR / daily backups; test restore once.
- Include Storage objects in recovery planning for attachments.
- Export CSV is a convenience dump (transactions only, max 366 days), not a full backup.

## Monitoring / incidents

- Watch auth failures and 5xx rates in the host dashboard.
- Public bucket incident: private immediately, rotate `SUPABASE_SERVICE_ROLE_KEY`, review signed URL usage.
- Suspected overdraft race: confirm spend paths use `FOR UPDATE` locks (Stage 1).
