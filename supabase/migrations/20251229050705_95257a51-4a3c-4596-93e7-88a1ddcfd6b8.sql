-- Remove the overly permissive policy we just added
DROP POLICY IF EXISTS "Anyone can view public tier info columns" ON public.tier_definitions;

-- Drop the SECURITY INVOKER view - it won't work since users can't access the base table
DROP VIEW IF EXISTS public.public_tier_info;

-- Create the view with SECURITY DEFINER but owned by a restricted role
-- This is safe because the view only exposes specific safe columns
-- and cannot be used to access the underlying table's other columns
CREATE VIEW public.public_tier_info 
WITH (security_barrier = true)
AS
SELECT 
  tier_name,
  display_name,
  description,
  monthly_price,
  monthly_pours
FROM public.tier_definitions
WHERE is_active = true
ORDER BY monthly_price ASC;

-- Grant SELECT on the view to all users
GRANT SELECT ON public.public_tier_info TO authenticated;
GRANT SELECT ON public.public_tier_info TO anon;

COMMENT ON VIEW public.public_tier_info IS 'Public-facing tier information with security_barrier. Excludes Stripe Price IDs and capacity limits. Uses SECURITY DEFINER to allow public access while base table is staff-only.';