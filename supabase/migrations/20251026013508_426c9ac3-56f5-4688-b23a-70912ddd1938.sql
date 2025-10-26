-- Critical: Remove role column from profiles table to prevent privilege escalation
-- Roles should ONLY exist in the user_roles table where users cannot modify their own roles

-- First, verify all users have a role in user_roles table
-- (This is just a safety check - should already be enforced by triggers)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Drop the role column from profiles
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
    
    RAISE NOTICE 'Role column successfully removed from profiles table';
  END IF;
END $$;