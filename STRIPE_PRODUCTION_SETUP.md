# Stripe Production Setup Guide

This document explains how to migrate from your development Stripe account to the restaurant's production Stripe account.

## Prerequisites
- Access to the restaurant's Stripe account
- Database access to update `tier_definitions` table
- Access to Lovable Cloud secrets management

## Step 1: Create Stripe Products (in Restaurant Account)

1. Log into the restaurant's Stripe Dashboard
2. Navigate to **Products** → **Add Product**
3. Create 4 products:

### Product 1: Select Membership
- Name: `Select Membership`
- Description: `4 pours per month`
- Price: `$47.00` / month (recurring)
- **Copy the Price ID**: `price_xxxxx`

### Product 2: Premier Membership
- Name: `Premier Membership`
- Description: `12 pours per month`
- Price: `$97.00` / month (recurring)
- **Copy the Price ID**: `price_xxxxx`

### Product 3: Elite Membership
- Name: `Elite Membership`
- Description: `20 pours per month`
- Price: `$147.00` / month (recurring)
- **Copy the Price ID**: `price_xxxxx`

### Product 4: Household Membership
- Name: `Household Membership`
- Description: `20 pours per month`
- Price: `$197.00` / month (recurring)
- **Copy the Price ID**: `price_xxxxx`

## Step 2: Update Stripe Secret Keys

1. Get the restaurant's **Live Secret Key** from Stripe Dashboard → Developers → API Keys
2. In Lovable, update the secret:
   - Open Lovable Cloud backend
   - Navigate to Secrets
   - Update `STRIPE_SECRET_KEY` with the live key (starts with `sk_live_`)

## Step 3: Update Database with Production Price IDs

Run these SQL commands in Lovable Cloud Database:

```sql
-- Update tier_definitions with production Stripe Price IDs
UPDATE tier_definitions 
SET stripe_price_id = 'price_PROD_SELECT_ID' 
WHERE tier_name = 'select';

UPDATE tier_definitions 
SET stripe_price_id = 'price_PROD_PREMIER_ID' 
WHERE tier_name = 'premier';

UPDATE tier_definitions 
SET stripe_price_id = 'price_PROD_ELITE_ID' 
WHERE tier_name = 'elite';

UPDATE tier_definitions 
SET stripe_price_id = 'price_PROD_HOUSEHOLD_ID' 
WHERE tier_name = 'household';
```

Replace `price_PROD_*_ID` with actual Price IDs from Step 1.

## Step 4: Configure Stripe Webhook

1. In Stripe Dashboard → Developers → Webhooks → Add Endpoint
2. **Endpoint URL**: `https://qqacjsczbrzerilgapqa.supabase.co/functions/v1/stripe-webhook`
3. **Description**: `Wine Club Membership Webhooks`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add Endpoint**
6. **Copy the Webhook Signing Secret** (starts with `whsec_`)
7. In Lovable, add secret:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: The signing secret from above

## Step 5: Test in Production

1. Create a test customer account
2. Complete the membership application
3. Use Stripe's test card: `4242 4242 4242 4242`
4. Verify:
   - Payment processes successfully
   - Customer record created
   - Membership record created
   - Pours balance initialized
   - Dashboard shows active membership

## Verification Checklist

- [ ] All 4 products created in Stripe with correct pricing
- [ ] All 4 Price IDs copied and stored
- [ ] `STRIPE_SECRET_KEY` updated with live key
- [ ] Database `tier_definitions.stripe_price_id` updated for all tiers
- [ ] Webhook endpoint created with correct URL
- [ ] `STRIPE_WEBHOOK_SECRET` added to Lovable secrets
- [ ] Test transaction completed successfully
- [ ] Customer and membership records created correctly

## Rollback Plan

If issues occur:
1. Revert `STRIPE_SECRET_KEY` to test key
2. Revert `tier_definitions.stripe_price_id` to test Price IDs
3. Delete production webhook endpoint

## Support

- Stripe Documentation: https://stripe.com/docs
- Lovable Documentation: https://docs.lovable.dev
- Issue Tracking: Contact development team

## Notes

- **No code changes required** for production migration
- All test data (subscriptions, customers) will not carry over
- Existing staff-approved memberships will continue working (use `toast_reference_number`)
- New memberships will use Stripe subscriptions

## Development Testing Setup

After deployment, you need to configure your test Stripe account:

### 1. Create Test Products

In your Stripe Dashboard (Test Mode):
- Create the 4 membership products with test prices
- Copy each Price ID (starts with `price_test_`)

### 2. Update Database with Test Price IDs

```sql
UPDATE tier_definitions SET stripe_price_id = 'price_test_SELECT_ID' WHERE tier_name = 'select';
UPDATE tier_definitions SET stripe_price_id = 'price_test_PREMIER_ID' WHERE tier_name = 'premier';
UPDATE tier_definitions SET stripe_price_id = 'price_test_ELITE_ID' WHERE tier_name = 'elite';
UPDATE tier_definitions SET stripe_price_id = 'price_test_HOUSEHOLD_ID' WHERE tier_name = 'household';
```

### 3. Configure Test Webhook

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://qqacjsczbrzerilgapqa.supabase.co/functions/v1/stripe-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy webhook signing secret
5. Add to Lovable Cloud secrets as `STRIPE_WEBHOOK_SECRET`

### 4. Test with Stripe Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0341`
- 3D Secure: `4000 0027 6000 3184`
