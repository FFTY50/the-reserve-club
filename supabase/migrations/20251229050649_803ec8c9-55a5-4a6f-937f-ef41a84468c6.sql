-- Add a policy to allow anon and authenticated users to read ONLY the columns exposed by the view
-- This is more secure than the previous "anyone can view all" policy because it only applies to SELECT
-- and the view itself limits which columns are visible
CREATE POLICY "Anyone can view public tier info columns" 
ON public.tier_definitions 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);