

# Fix Tricia Motes' Pour Reset + Prevent Future Missed Resets

## Problem

Tricia Motes (Select tier, 2 pours/month) had her billing period renewal around Feb 4, but the billing period in the database was never updated from Jan 4 - Feb 4 to Feb 4 - Mar 4. Because the `get_available_pours` function counts pours within the billing period window, her 2 pours from Jan 18 still count against her — making it look like she has 0 available.

The Stripe `invoice.payment_succeeded` webhook is supposed to update billing period dates on renewal, but it appears the event was either not received or failed silently.

## Root Causes

1. The billing period was not updated when Stripe renewed the subscription around Feb 4
2. The `pours_balance` column on the `customers` table is never reset by any process — it's essentially stale data
3. No fallback mechanism exists if a webhook is missed

## Plan

### Step 1: Immediate Data Fix for Tricia Motes

Manually update her membership billing period to the current Stripe cycle. We need to check Stripe for her actual current period dates, but based on the Jan 4 start, her new period should be approximately Feb 4 - Mar 4.

- Update `memberships` table: set `billing_period_start` and `billing_period_end` to the new cycle
- Update `customers.pours_balance` to 2 (her Select tier allocation) for display consistency

### Step 2: Improve the `invoice.payment_succeeded` Webhook Handler

Modify `supabase/functions/stripe-webhook/index.ts` to also reset `pours_balance` on the customer record when a renewal payment succeeds:

- After updating the membership billing period, also update `customers.pours_balance` to the tier's `monthly_pours` value
- Add the tier lookup to get the correct pour allocation
- Add more detailed logging so missed renewals are easier to diagnose

### Step 3: Add a Safety Net — Billing Period Fallback

Update the `get_available_pours` database function to handle expired billing periods more gracefully:

- If `billing_period_end` is in the past (meaning a renewal was missed in the DB), treat the current date as being in a new period and return full pour allocation
- This prevents customers from being stuck at 0 pours if a webhook is missed

## Technical Details

### Files Modified

- `supabase/functions/stripe-webhook/index.ts` — Add `pours_balance` reset and tier lookup in the `invoice.payment_succeeded` handler, plus improved logging
- `supabase/migrations/` — New migration to update the `get_available_pours` function with expired-period fallback logic

### Data Changes

- Update Tricia Motes' membership (`id: 07190b09-0c31-47b8-95dd-0f5927461334`): set billing period to Feb 4 - Mar 4
- Update Tricia Motes' customer record (`id: d7608936-baa2-4417-a21d-475aa46dced3`): set `pours_balance = 2`

### Webhook Handler Changes (invoice.payment_succeeded)

```
Current flow:
  1. Retrieve subscription from Stripe
  2. Find membership by stripe_subscription_id
  3. Update membership billing_period_start and billing_period_end
  4. Update customer last_activity

New flow:
  1. Retrieve subscription from Stripe
  2. Find membership by stripe_subscription_id (also fetch tier)
  3. Look up tier_definitions to get monthly_pours
  4. Update membership billing_period_start and billing_period_end
  5. Reset customers.pours_balance to monthly_pours
  6. Update customer last_activity
  7. Log detailed renewal info
```

### get_available_pours Function Update

Add a check: if `billing_period_end < now()`, assume we're in a new period and return the full tier allocation. This acts as a safety net so customers are never blocked due to a missed webhook.

