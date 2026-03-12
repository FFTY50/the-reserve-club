

# Add `customer.subscription.updated` Webhook Handler

## What & Why

When a member upgrades or downgrades their tier mid-cycle via Stripe, the change happens immediately in Stripe but the database only syncs on the next `invoice.payment_succeeded` event. Adding a `customer.subscription.updated` handler ensures tier, price, and pour allocation update instantly.

## Changes

### 1. Update webhook handler (`supabase/functions/stripe-webhook/index.ts`)

Add a new `customer.subscription.updated` case before the `default` block (around line 359):

- Extract the subscription object and its current `price_id`
- Look up the matching tier in `tier_definitions` by `stripe_price_id`
- Find the active membership by `stripe_subscription_id`
- If the tier has changed:
  - Update `memberships` table: set `tier` and `monthly_price`
  - Update `customers` table: set `tier` and reset `pours_balance` to the new tier's `monthly_pours`
- If tier hasn't changed, skip (avoid unnecessary writes)
- Log the change for diagnostics

### 2. Update Stripe webhook configuration

The user will need to add `customer.subscription.updated` to their Stripe webhook endpoint's event list. The plan doc (`STRIPE_PRODUCTION_SETUP.md`) will be updated to include this event.

### 3. Update `STRIPE_PRODUCTION_SETUP.md`

Add `customer.subscription.updated` to the events list in the webhook configuration section.

## Technical Notes

- The handler is idempotent — if `invoice.payment_succeeded` fires afterward with the same tier, it will detect no change and just update billing dates
- The `get_available_pours` safety net still applies as a fallback
- No database migration needed — all existing tables and columns are sufficient

