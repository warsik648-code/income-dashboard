# Production runbook (Stage 1)

Do not deploy until Stage 1+ remediations are complete and you explicitly approve a deploy.

## Supabase Storage — private bucket (required)

The app stores financial attachments (receipts, PDFs, images) in Supabase Storage using the **service role key on the server only**.

Checklist before go-live:

1. Bucket name matches `SUPABASE_ATTACHMENTS_BUCKET` (default: `financial-attachments`).
2. Bucket is **Private** (not public).
3. There are **no** public read/write Storage policies on this bucket.
4. Clients must never receive `SUPABASE_SERVICE_ROLE_KEY`.
5. Browser access is only via short-lived **signed URLs** created by the server after ownership checks.
6. Confirm in Supabase Dashboard → Storage → bucket settings: Public = off.
7. Do not add anonymous/`authenticated` policies that grant `select`/`insert`/`update`/`delete` on this bucket for general users.

If the bucket is ever made public, treat it as a **data exposure incident**: rotate keys, make the bucket private again, and audit object access.

## Required production environment variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres connection string (server-only) |
| `AUTH_SECRET` | Strong random secret for Auth.js |
| `AUTH_URL` | Public HTTPS origin of the app |
| `AUTH_TRUST_HOST` | `true` behind Vercel / reverse proxies |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **server-only**, never `NEXT_PUBLIC_` |
| `SUPABASE_ATTACHMENTS_BUCKET` | Private bucket name |
| `SUPABASE_SIGNED_URL_TTL_SECONDS` | Optional; 30–3600, default 120 |

After seeding the owner account, remove `OWNER_EMAIL` / `OWNER_PASSWORD` from production env.

## Database migrations

```bash
pnpm exec prisma migrate deploy
```

Never run `prisma migrate reset` against production.

## Backups

- Enable Supabase (or host) automated Postgres backups / PITR.
- Test a restore once before relying on it.
- Attachments live in Storage — include Storage in your backup/recovery plan.
