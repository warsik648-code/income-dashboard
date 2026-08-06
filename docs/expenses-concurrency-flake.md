# Known flake: `expenses.concurrency` integration test

**Suite:** `lib/services/expenses.concurrency.test.ts`  
**Test:** `prevents concurrent expenses from overdrawing the account`  
**Database:** `TEST_DATABASE_URL` only (never production)

## Status

Intermittent failure under remote/slow Supabase pooler load. Transfers integrity and subscription renewal integration suites pass in the same runs.

## Not caused by timezone parsing

After the Europe/Istanbul code-only policy:

- `createExpense` accepts `datetime-local`, absolute ISO (`…Z`), and date-only `YYYY-MM-DD`.
- The concurrency test payload uses `transactionDate: new Date().toISOString().slice(0, 10)` (date-only), which parses successfully as UTC midnight of that civil date (legacy-compatible).
- Failures observed were assertion mismatches around concurrent reject reasons / fulfilled counts under lock contention — not `Invalid datetime-local value`.

## Likely cause

Race / pooler timing with `FOR UPDATE` balance locks: both requests may reject, or the reject reason may not match the narrow `instanceof ExpenseServiceError` / message regex under remote latency. Domain overdraft protection remains enforced in the service layer.

## Follow-up (optional)

- Relax reject-reason matching further, or retry once on lock timeout.
- Run the suite against a local Postgres when diagnosing lock behavior.
- Do not “fix” by changing production balances or timezone storage.
