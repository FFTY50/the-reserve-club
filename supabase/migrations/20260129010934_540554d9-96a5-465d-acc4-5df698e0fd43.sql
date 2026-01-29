-- FIX 1: Remove overly permissive "Require authentication for profiles" policy
-- This policy allows any authenticated user to access all profiles which is a security risk
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- FIX 2: Create a view for customers that excludes sensitive fields (activation_key)
-- Then modify RLS to use the view pattern for secondary users
-- First, create a public view that excludes sensitive fields
CREATE OR REPLACE VIEW public.customers_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    tier,
    member_since,
    pours_balance,
    total_pours_lifetime,
    status,
    signed_up_by_staff_id,
    created_at,
    updated_at,
    last_activity,
    preferences,
    secondary_user_id,
    qr_code_url
    -- Excludes: activation_key
  FROM public.customers;

-- Drop the existing secondary user policy that exposes activation_key
DROP POLICY IF EXISTS "Secondary users can view family customer data" ON public.customers;

-- Recreate secondary user policy that only allows viewing non-sensitive fields
-- Secondary users will query through the customers_public view instead
-- We need a policy that blocks direct access but allows view access
-- Create a new policy for secondary users that restricts to specific columns

-- Actually, RLS doesn't support column-level restrictions directly
-- The safest approach is to ensure secondary users go through an edge function
-- For now, we'll update the application to not query sensitive fields

-- Alternative: Create a function that returns safe customer data for secondary users
CREATE OR REPLACE FUNCTION public.get_family_customer_data(p_secondary_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tier customer_tier,
  member_since date,
  pours_balance integer,
  total_pours_lifetime integer,
  status customer_status,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_activity timestamp with time zone,
  secondary_user_id uuid,
  qr_code_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.user_id,
    c.tier,
    c.member_since,
    c.pours_balance,
    c.total_pours_lifetime,
    c.status,
    c.created_at,
    c.updated_at,
    c.last_activity,
    c.secondary_user_id,
    c.qr_code_url
  FROM public.customers c
  WHERE c.secondary_user_id = p_secondary_user_id;
$$;

-- FIX 3: Add explicit policies for rate_limits table for service role
-- This documents the intended access pattern (service role only)
-- Note: Service role bypasses RLS anyway, but this adds documentation

-- Add admin read-only policy for monitoring rate limits
CREATE POLICY "Admins can view rate limits for monitoring"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));