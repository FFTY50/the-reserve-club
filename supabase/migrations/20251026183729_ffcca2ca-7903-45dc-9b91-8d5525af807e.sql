-- Add billing period tracking to memberships table
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS billing_period_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS billing_period_end timestamp with time zone;

-- Create a function to calculate available pours for a customer
CREATE OR REPLACE FUNCTION get_available_pours(customer_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_tier customer_tier;
  tier_max_pours integer;
  period_start timestamp with time zone;
  period_end timestamp with time zone;
  used_pours integer;
  available integer;
BEGIN
  -- Get active membership details
  SELECT m.tier, m.billing_period_start, m.billing_period_end, td.monthly_pours
  INTO membership_tier, period_start, period_end, tier_max_pours
  FROM memberships m
  JOIN tier_definitions td ON td.tier_name = m.tier
  WHERE m.customer_id = customer_uuid 
    AND m.status = 'active'
  ORDER BY m.created_at DESC
  LIMIT 1;

  -- If no active membership, return 0
  IF membership_tier IS NULL THEN
    RETURN 0;
  END IF;

  -- If billing period not set, use start_date as fallback
  IF period_start IS NULL THEN
    SELECT start_date INTO period_start
    FROM memberships
    WHERE customer_id = customer_uuid AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    period_start := period_start::timestamp with time zone;
    period_end := (period_start + interval '1 month')::timestamp with time zone;
  END IF;

  -- Count pours used in current billing period
  SELECT COALESCE(SUM(quantity), 0)
  INTO used_pours
  FROM pours
  WHERE customer_id = customer_uuid
    AND created_at >= period_start
    AND (period_end IS NULL OR created_at < period_end)
    AND status = 'redeemed';

  -- Calculate available (never negative, never exceed tier max)
  available := GREATEST(0, tier_max_pours - used_pours);
  
  RETURN available;
END;
$$;