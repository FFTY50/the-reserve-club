-- Add Stripe-related columns to tier_definitions
ALTER TABLE tier_definitions 
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR;

-- Add Stripe-related columns to memberships
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;

-- Add Stripe session tracking to membership_applications
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR;