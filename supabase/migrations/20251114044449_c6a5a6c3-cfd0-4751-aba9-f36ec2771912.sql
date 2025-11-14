-- Add is_approved column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Update existing staff users to be approved (for current staff)
UPDATE public.user_roles 
SET is_approved = true 
WHERE role = 'staff';

-- Update the has_role function to check approval status for staff
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (role != 'staff' OR is_approved = true)
  )
$$;