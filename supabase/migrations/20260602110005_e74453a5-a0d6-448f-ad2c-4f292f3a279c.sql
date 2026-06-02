
-- 1. Fix sync_logs always-true INSERT policy
DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.sync_logs;
CREATE POLICY "Service role can insert sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 2. Make views enforce caller RLS (security_invoker)
ALTER VIEW public.staff_profile_view SET (security_invoker = true);
ALTER VIEW public.customers_public SET (security_invoker = true);

-- 3. Add fixed search_path to pgmq wrapper SECURITY DEFINER functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 4. Revoke EXECUTE on internal SECURITY DEFINER functions from anon and authenticated.
-- These are only meant to be called by edge functions using the service role.
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reserve_tier_slot(customer_tier, uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_tier_slot(customer_tier, uuid) TO service_role, authenticated;
