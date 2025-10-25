-- Add RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Staff can view all roles
CREATE POLICY "Staff can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

-- Only system can insert/update roles (via triggers/functions)
-- No direct INSERT/UPDATE policies for user_roles to prevent privilege escalation