
-- 1) Revoke column-level access to activation_key from regular roles.
-- Service role (used by backend code) bypasses these grants.
REVOKE SELECT (activation_key) ON public.customers FROM authenticated;
REVOKE SELECT (activation_key) ON public.customers FROM anon;

-- Re-grant SELECT on all OTHER columns to authenticated so existing queries keep working.
GRANT SELECT (
  id, user_id, tier, member_since, pours_balance, total_pours_lifetime,
  status, signed_up_by_staff_id, qr_code_url, created_at, updated_at,
  last_activity, preferences, secondary_user_id
) ON public.customers TO authenticated;

-- 2) Profiles: add a RESTRICTIVE policy denying anonymous reads explicitly.
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- 3) Drop the overly permissive INSERT policy on qr_verification_logs.
-- Service role inserts (used by the edge function) bypass RLS regardless.
DROP POLICY IF EXISTS "Service role can insert logs" ON public.qr_verification_logs;
