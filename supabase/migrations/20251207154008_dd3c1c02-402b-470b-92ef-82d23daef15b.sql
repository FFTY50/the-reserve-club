-- Update has_role function to handle admin (admin has all permissions)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role 
        OR role = 'admin'
      )
      AND (role NOT IN ('staff', 'admin') OR is_approved = true)
  )
$$;

-- Create a function to check if user is admin specifically
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND is_approved = true
  )
$$;

-- Allow admins to manage user_roles (approve staff, assign roles)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to update memberships
CREATE POLICY "Admins can update memberships"
ON public.memberships
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to delete memberships
CREATE POLICY "Admins can delete memberships"
ON public.memberships
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to delete customers
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to update/delete pours
CREATE POLICY "Admins can update pours"
ON public.pours
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete pours"
ON public.pours
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to manage tier_definitions
CREATE POLICY "Admins can insert tier definitions"
ON public.tier_definitions
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tier definitions"
ON public.tier_definitions
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tier definitions"
ON public.tier_definitions
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to delete applications
CREATE POLICY "Admins can delete applications"
ON public.membership_applications
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));