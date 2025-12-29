-- Drop the problematic view - we'll rely on the edge function for public tier info
DROP VIEW IF EXISTS public.public_tier_info;

-- The tier_definitions table is now only accessible by staff/admin
-- Public users get tier info through the check-tier-availability edge function
-- which uses service role and only returns safe columns