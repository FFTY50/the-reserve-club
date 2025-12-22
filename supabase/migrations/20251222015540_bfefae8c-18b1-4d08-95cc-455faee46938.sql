-- Atomic inventory locking function to prevent race conditions
-- Uses SELECT ... FOR UPDATE to lock the tier row during the transaction
CREATE OR REPLACE FUNCTION public.reserve_tier_slot(
  _tier_name customer_tier,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_subscriptions integer;
  _current_count integer;
  _result jsonb;
BEGIN
  -- Lock the tier definition row to prevent concurrent modifications
  SELECT max_subscriptions INTO _max_subscriptions
  FROM tier_definitions
  WHERE tier_name = _tier_name
  FOR UPDATE;

  -- If no max set, always allow
  IF _max_subscriptions IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No limit set for this tier',
      'available', null,
      'max', null
    );
  END IF;

  -- Count current active subscriptions for this tier
  SELECT COUNT(*) INTO _current_count
  FROM memberships
  WHERE tier = _tier_name
    AND status = 'active';

  -- Check if slot is available
  IF _current_count >= _max_subscriptions THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tier is sold out',
      'available', 0,
      'max', _max_subscriptions,
      'current', _current_count
    );
  END IF;

  -- Slot is available
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Slot available',
    'available', _max_subscriptions - _current_count,
    'max', _max_subscriptions,
    'current', _current_count
  );
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.reserve_tier_slot(customer_tier, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_tier_slot(customer_tier, uuid) TO service_role;