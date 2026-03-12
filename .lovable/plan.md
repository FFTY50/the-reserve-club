

# Complete Stripe Safety Net Implementation

This is the consolidated plan covering everything discussed: the sync function, sync_logs audit table, AddPour/QR UI fixes, daily cron scheduling, and Wallace Reese test account cleanup.

## Changes

### 1. Create `sync_logs` database table (migration)

New table for persistent audit trail:
- Columns: `id`, `sync_type` (text), `customer_id` (uuid, nullable), `membership_id` (uuid, nullable), `changes` (jsonb), `status` (text: success/skipped/error), `error_message` (text, nullable), `created_at` (timestamptz)
- RLS: admin-only SELECT, open INSERT (service role uses it)

### 2. Create `sync-stripe-subscriptions` edge function

New file: `supabase/functions/sync-stripe-subscriptions/index.ts`

- Queries all active memberships that have a `stripe_subscription_id`
- For each, fetches the subscription from the Stripe API
- Compares billing period, tier (via `stripe_price_id` match to `tier_definitions`), and price
- Updates any mismatches in `memberships` and `customers` tables
- Inserts a `sync_logs` row for each membership processed, recording old/new values in the `changes` jsonb column
- Inserts a summary row at the end with totals (processed, updated, skipped, errored)
- Add to `supabase/config.toml` with `verify_jwt = false`

### 3. Fix AddPour page stale display (`src/pages/staff/AddPour.tsx`)

The page currently shows `customer.pours_balance` from route state (stale) and uses it for the input `max` and button disable check. Fix:

- Add a `useEffect` that calls `get-available-pours` edge function on mount using the customer ID
- Store the result in local state (`availablePours`)
- Replace `customer.pours_balance` references with the live value for display, input `max`, and submit button disable logic
- Show a loading spinner while fetching

### 4. Fix `verify-qr-token` to return accurate pours

In `supabase/functions/verify-qr-token/index.ts` (line 148-198):

- After fetching the customer record, call the `get_available_pours` database RPC instead of returning raw `pours_balance`
- Return the RPC result as `pours_balance` in the response so downstream consumers (AddPour) get accurate data even from route state

### 5. Schedule daily sync with pg_cron (data insert, not migration)

Enable `pg_cron` and `pg_net` extensions, then create a cron job:
- Runs daily at 4 AM UTC
- Calls `sync-stripe-subscriptions` via `net.http_post`
- Uses the project URL and anon key

### 6. Delete Wallace Reese III test account (data operation)

Delete related records in order: `pours` -> `memberships` -> `customers` -> `user_roles` -> `profiles` for the known test account IDs.

### 7. Update `STRIPE_PRODUCTION_SETUP.md`

Document the sync function and daily cron job.

## File Summary

| File | Action |
|------|--------|
| `supabase/functions/sync-stripe-subscriptions/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| `src/pages/staff/AddPour.tsx` | Fix stale pours display |
| `supabase/functions/verify-qr-token/index.ts` | Use `get_available_pours` RPC |
| `STRIPE_PRODUCTION_SETUP.md` | Document sync + cron |
| Database migration | Create `sync_logs` table |
| Database insert | pg_cron job + Wallace Reese cleanup |

