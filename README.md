# Income Dashboard

Private personal finance app for a single owner: income, expenses, subscriptions, debts, analytics, attachments, and audit history.

## Stack

Next.js (App Router), Prisma + PostgreSQL, Auth.js (credentials), Supabase Storage (private), Zod, Tailwind.

## Local setup

1. Copy [`.env.example`](.env.example) to `.env` and fill values.
2. `pnpm install`
3. `pnpm exec prisma migrate deploy`
4. `pnpm db:seed-owner` (once)
5. `pnpm dev` → http://localhost:3000

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates |
| `pnpm exec prisma migrate deploy` | Apply migrations |

## Production

See [`docs/production-runbook.md`](docs/production-runbook.md). Do not deploy until that checklist is green and you approve a deploy.

## Security notes

- Registration is disabled; owner is seeded.
- Attachments use a **private** Supabase bucket and short-lived signed URLs.
- Never commit `.env` or put the service role key in `NEXT_PUBLIC_*` variables.
