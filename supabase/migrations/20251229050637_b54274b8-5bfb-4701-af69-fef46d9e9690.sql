-- Recreate the view with SECURITY INVOKER to use the querying user's permissions
DROP VIEW IF EXISTS public.public_tier_info;

CREATE VIEW public.public_tier_info 
WITH (security_invoker = true)
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

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_tier_info TO authenticated;
GRANT SELECT ON public.public_tier_info TO anon;

-- Add a comment explaining the security design
COMMENT ON VIEW public.public_tier_info IS 'Public-facing tier information with SECURITY INVOKER. Excludes sensitive data like Stripe Price IDs and capacity limits.';