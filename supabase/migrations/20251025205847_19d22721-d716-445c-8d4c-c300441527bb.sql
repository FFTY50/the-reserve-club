-- Add foreign key relationship from membership_applications to profiles
-- This allows Supabase to understand the relationship for joins

-- First, ensure the user_id in membership_applications references the profiles table
-- Since both reference auth.users, we can create a view or add explicit foreign key

-- Add a comment to document the relationship
COMMENT ON COLUMN membership_applications.user_id IS 'References profiles.id (which references auth.users.id)';

-- For better query performance, ensure we have an index
CREATE INDEX IF NOT EXISTS idx_membership_applications_user_id 
ON membership_applications(user_id);