# Production runbook

Do not deploy until Critical #3 (renewalPeriod unique) is applied, CI is green, and you explicitly approve a deploy.

## Pre-deploy gates

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass (CI on PR).
2. `prisma migrate deploy` applied on the production database (never `migrate reset`).
3. Subscription renewals use `Transaction.renewalPeriod` + unique `(subscriptionId, renewalPeriod)` — not notes text.
4. Supabase `financial-attachments` bucket is **private** (no public policies).
5. Rotate any secrets that were ever pasted in chat; remove `OWNER_EMAIL` / `OWNER_PASSWORD` from production after seed.
6. Smoke test: login → dashboard → create income/expense → confirm subscription → export CSV (POST) → sign out.

## Isolated integration-test database

DB integration tests **must** use `TEST_DATABASE_URL`. They never fall back to `DATABASE_URL`.

| Rule | Detail |
|------|--------|
| Required env | `TEST_DATABASE_URL` |
| No fallback | If missing, integration suites skip (unit tests still run) |
| Safety marker | DB name must contain `test`, or URL has `?integration_test=1`, or `INTEGRATION_TEST_DB_MARKER` matches the URL |
| Separation | `TEST_DATABASE_URL` must not be identical to `DATABASE_URL` |
| Data | Disposable `*.test` users only; cleaned up in `afterAll` |

### Local / Supabase test project setup

```bash
# 1. Create a separate Supabase project (e.g. income-dashboard-test)
# 2. Copy the template and paste Session/pooler + direct URLs:
cp .env.integration.example .env.integration

# 3. Edit .env.integration only (never change production DATABASE_URL in .env):
#    TEST_DATABASE_URL=...&integration_test=1
#    TEST_DIRECT_URL=...&integration_test=1

# 4. Apply migrations to the TEST database only
pnpm db:migrate:test

# 5. Run integration suites
pnpm test:integration
```

`pnpm db:migrate:test` loads `.env.integration`, prefers `TEST_DIRECT_URL`, refuses URLs identical to production `DATABASE_URL`, and never writes to `.env`.

Do **not** run integration tests against production or the primary app database.

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

### Remaining: sharp via Next.js (GHSA-f88m-g3jw-g9cj) — no safe stable fix yet

| Item | Detail |
|------|--------|
| Advisory | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) |
| CVEs | CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 (libvips) |
| Severity | High (audit) |
| Affected | `sharp` **&lt; 0.35.0** |
| Patched | `sharp` **≥ 0.35.0** (current patched release: 0.35.3) |
| Chain | `income-dashboard` → `next@16.2.12` → optional `sharp@0.34.5` (also via `next-auth` → `next`) |
| Installed | **sharp@0.34.5** (confirmed via `pnpm why sharp`) |
| Next pin | `next@16.2.12` optionalDependency `sharp: ^0.34.5` |
| Upstream status | Stable Next latest is still **16.2.12**. Only **`next@canary` (16.3.0-canary.x)** declares `sharp: ^0.35.3` |

**Why we did not force a fix**

1. No stable Next.js release yet ships patched sharp.
2. Jumping to `next@canary` is not production-safe.
3. Overriding `sharp` to 0.35.x under Next 16.2.x has reported Turbopack / platform runtime issues ([next.js#96064](https://github.com/vercel/next.js/issues/96064)). That is a breaking override for this stack — not applied.

**Reachability in this app**

- This app does **not** import `sharp` and does **not** use `next/image` (previews use plain `<img>` / sandboxed iframe + Supabase signed URLs).
- Advisory impact is for processing **untrusted image input** through sharp/libvips.
- Residual surface: Next’s optional image optimizer (`/_next/image`) if invoked. We do not configure remote image optimization hosts, and UI code does not call it.
- Attachment uploads validate MIME/extension/magic bytes and store blobs in private Supabase Storage; they are **not** processed by sharp.

**Follow-up**

When a **stable** Next release pins `sharp >= 0.35.0`, upgrade `next` + `eslint-config-next` (exact), re-run `pnpm audit`, `pnpm test`, `pnpm build`. Re-run `pnpm audit` after each Next bump.

## Backups

- Enable Postgres PITR / daily backups; test restore once.
- Include Storage objects in recovery planning for attachments.
- Export CSV is a convenience dump (transactions only, max 366 days), not a full backup.

## Monitoring / incidents

- Watch auth failures and 5xx rates in the host dashboard.
- Public bucket incident: private immediately, rotate `SUPABASE_SERVICE_ROLE_KEY`, review signed URL usage.
- Suspected overdraft race: confirm spend paths use `FOR UPDATE` locks (Stage 1).
