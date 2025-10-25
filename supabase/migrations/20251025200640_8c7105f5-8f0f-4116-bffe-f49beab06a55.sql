-- Fix critical security issue: Move roles to separate table
-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents privilege escalation)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop old RLS policies that use profiles.role
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view all memberships" ON public.memberships;
DROP POLICY IF EXISTS "Staff can insert memberships" ON public.memberships;
DROP POLICY IF EXISTS "Staff can view all pours" ON public.pours;
DROP POLICY IF EXISTS "Staff can insert pours" ON public.pours;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Create new secure RLS policies using has_role function
CREATE POLICY "Staff can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can view all memberships"
ON public.memberships
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert memberships"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can view all pours"
ON public.pours
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert pours"
ON public.pours
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

-- Update handle_new_user function to create user_role entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Create role (default to customer)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  
  RETURN NEW;
END;
$$;