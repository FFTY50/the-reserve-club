-- Create a view for staff to access only non-sensitive profile data
CREATE OR REPLACE VIEW public.staff_profile_view AS
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.is_active,
  p.created_at,
  c.tier,
  c.status AS customer_status,
  c.member_since
FROM public.profiles p
LEFT JOIN public.customers c ON c.user_id = p.id;

-- Grant access to authenticated users (RLS will still apply)
GRANT SELECT ON public.staff_profile_view TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.staff_profile_view SET (security_invoker = true);

-- Update the profiles RLS policy to restrict email/phone access
-- First, drop the existing broad staff policy
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Create more restrictive policies
-- Staff can view basic profile info (names, activity)
CREATE POLICY "Staff can view basic profile info"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::app_role)
);

-- Note: The above policy still allows full access. To truly restrict columns,
-- staff should use the staff_profile_view instead of querying profiles directly.
-- The application code should be updated to use the view.

COMMENT ON VIEW public.staff_profile_view IS 'Limited profile view for staff - excludes email and phone for data minimization';