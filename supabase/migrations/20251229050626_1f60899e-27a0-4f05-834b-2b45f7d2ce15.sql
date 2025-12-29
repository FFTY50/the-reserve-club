-- First, drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view tier definitions" ON public.tier_definitions;

-- Create a more restrictive policy - only staff/admin can view full tier_definitions
CREATE POLICY "Staff and admins can view tier definitions" 
ON public.tier_definitions 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::app_role));

-- Create a public view with ONLY safe columns for customer-facing pages
-- This excludes: stripe_price_id, max_subscriptions, features, is_active
CREATE OR REPLACE VIEW public.public_tier_info AS
SELECT 
  tier_name,
  display_name,
  description,
  monthly_price,
  monthly_pours
FROM public.tier_definitions
WHERE is_active = true
ORDER BY monthly_price ASC;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_tier_info TO authenticated;
GRANT SELECT ON public.public_tier_info TO anon;

-- Add a comment explaining the security design
COMMENT ON VIEW public.public_tier_info IS 'Public-facing tier information. Excludes sensitive data like Stripe Price IDs and capacity limits.';